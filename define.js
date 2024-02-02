function define(arg1, arg2, arg3) {
  let name = arg1;
  let dependencies = arg2;
  let factory = arg3;

  if (typeof name !== "string") {
    // Adjust args appropriately
    factory = dependencies;
    dependencies = name;
    name = null;
  }

  // This module may not have dependencies
  if (!Array.isArray(dependencies)) {
    factory = dependencies;
    dependencies = null;
  }

  if (typeof factory !== "function") return;

  const currentScriptTag = document.currentScript;

  if (currentScriptTag.dataset.isFragment) {
    constructFragment();
    return;
  }

  const isOurSharedLibraryScript = !!currentScriptTag.dataset.fragments;
  if (!isOurSharedLibraryScript) {
    handleRegularDefine(name, dependencies, factory);
    return;
  }

  const fragments = currentScriptTag.dataset.fragments.split(",");
  const libraryName = currentScriptTag.dataset.globalName;
  // Create reference to the current library pointing to following names
  const libraryAliases = currentScriptTag.dataset.aliases;
  const libraryVersion = currentScriptTag.dataset.version;
  // Dont reuse the existing instance of the current package from other fragment
  const libraryUniqueInstance = currentScriptTag.dataset.unique === "true";

  fragments.forEach((fragment) => {
    initDefaultSharedLibraries(fragment);
    initDefaultSharedLibrariesQueue(fragment);

    function defineLibrary() {
      // Check if the instance of the currently laoded library
      // already exists on other fragment
      const existingFragmentName =
        !libraryUniqueInstance &&
        fragments.filter(
          (_fragment) =>
            window.sharedLibraries[_fragment] &&
            window.sharedLibraries[_fragment][libraryName] &&
            window.sharedLibraries[_fragment][libraryName].__version === libraryVersion
        )[0];

      // If the instance exists just create a reference to it
      if (existingFragmentName) {
        window.sharedLibraries[fragment][libraryName] = window.sharedLibraries[existingFragmentName][libraryName];
        onAfterLibraryLoaded(fragment);
        return;
      }

      const missingDependencies = getMissingDependencies(fragment);

      if (missingDependencies.length === 0) {
        constructModule(fragment);
        onAfterLibraryLoaded(fragment);
        return;
      }

      // If there is some dependency NOT loaded, add it to waiting queue
      missingDependencies.forEach((dependency) => {
        if (!window.sharedLibrariesQueue[fragment][dependency]) {
          window.sharedLibrariesQueue[fragment][dependency] = [];
        }

        window.sharedLibrariesQueue[fragment][dependency] = [
          ...window.sharedLibrariesQueue[fragment][dependency],
          defineLibrary,
        ];
      });
    }

    defineLibrary();
  });

  function onAfterLibraryLoaded(fragment) {
    window["sharedLibraries_" + fragment + "_" + libraryName] = window.sharedLibraries[fragment][libraryName]; // needed for our UMD fragments
    defineVersionAndAliases(fragment);
    dispatchLoadedEvent(fragment);

    const queueCallbacks = [...(window.sharedLibrariesQueue[fragment][libraryName] || [])];
    window.sharedLibrariesQueue[fragment][libraryName] = [];
    queueCallbacks.forEach((cb) => cb());
  }

  function constructFragment() {
    initDefaultSharedLibraries(name);

    function tryConstructFragment() {
      const missingLibs = getMissingDependencies(name);
      if (missingLibs.length === 0) {
        const mappedDeps = dependencies.map((dep) => window.sharedLibraries[name][dep]);
        factory(...mappedDeps);
      }
    }
    tryConstructFragment();

    window.addEventListener("shared-library-loaded", function ({ detail }) {
      if (detail.fragment === name) {
        tryConstructFragment();
      }
    });
  }

  function initDefaultSharedLibraries(fragment) {
    if (!window.sharedLibraries) {
      window.sharedLibraries = {};
    }
    if (!window.sharedLibraries[fragment]) {
      window.sharedLibraries[fragment] = {};
    }
  }

  function initDefaultSharedLibrariesQueue(fragment) {
    if (!window.sharedLibrariesQueue) {
      window.sharedLibrariesQueue = {};
    }
    if (!window.sharedLibrariesQueue[fragment]) {
      window.sharedLibrariesQueue[fragment] = {};
    }
  }

  function defineVersionAndAliases(fragment) {
    // Add version information to the library instance
    Object.defineProperty(window.sharedLibraries[fragment][libraryName], "__version", {
      value: libraryVersion,
      writable: false,
    });

    // Chcek if we should create aliases on window object for current library
    if (libraryAliases && typeof libraryAliases === "string" && libraryAliases.trim() !== "") {
      const libraryAliasesArr = libraryAliases.split(",");

      libraryAliasesArr.forEach((libraryAlias) => {
        window.sharedLibraries[fragment][libraryAlias] = window.sharedLibraries[fragment][libraryName];
      });
    }
  }

  function dispatchLoadedEvent(fragment) {
    window.dispatchEvent(new CustomEvent("shared-library-loaded", { detail: { fragment } }));
  }

  function getMissingDependencies(fragment) {
    if (!dependencies) {
      return [];
    }
    return dependencies
      .filter((dependency) => dependency !== "exports")
      .filter((dependency) => window.sharedLibraries[fragment][dependency] === undefined);
  }

  function constructModule(fragment) {
    let mappedDependencies = [];

    if (Array.isArray(dependencies)) {
      mappedDependencies = dependencies.map((dependency) =>
        dependency === "exports"
          ? (window.sharedLibraries[fragment][libraryName] = {})
          : window.sharedLibraries[fragment][dependency]
      );
    }

    if (window.sharedLibraries[fragment][libraryName]) {
      factory(...mappedDependencies);
    } else {
      window.sharedLibraries[fragment][libraryName] = factory(...mappedDependencies);
    }
  }

  function handleRegularDefine(name, _dependencies, factory) {
    const dependencies = [...(_dependencies || [])];
    window.globalLibs = window.globalLibs || {};
    window.globalLibsLoadingQueue = window.globalLibsLoadingQueue || {};

    function tryConstructGlobalLib() {
      const missingDeps = dependencies.filter((dep) => !Object.keys(window.globalLibs).includes(dep));

      if (missingDeps.length === 0) {
        const lib = factory(...dependencies.map((dep) => window.globalLibs[dep]));
        if (name) {
          window.globalLibs[name] = lib;
        }

        const queueCallbacks = [...(window.globalLibsLoadingQueue[name] || [])];
        window.globalLibsLoadingQueue[name] = [];
        queueCallbacks.forEach((cb) => cb());
        return;
      }

      missingDeps.forEach((dep) => {
        window.globalLibsLoadingQueue[dep] = window.globalLibsLoadingQueue[dep] || [];
        window.globalLibsLoadingQueue[dep].push(tryConstructGlobalLib);
      });
    }

    tryConstructGlobalLib();
  }
}

define.amd = true;
