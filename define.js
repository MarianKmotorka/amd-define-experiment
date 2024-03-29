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
        if (!window.sharedLibraries.LOADING_QUEUE[fragment][dependency]) {
          window.sharedLibraries.LOADING_QUEUE[fragment][dependency] = [];
        }

        window.sharedLibraries.LOADING_QUEUE[fragment][dependency] = [
          ...window.sharedLibraries.LOADING_QUEUE[fragment][dependency],
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

    const queueCallbacks = [...(window.sharedLibraries.LOADING_QUEUE[fragment][libraryName] || [])];
    window.sharedLibraries.LOADING_QUEUE[fragment][libraryName] = [];
    queueCallbacks.forEach((cb) => cb());
  }

  function constructFragment() {
    initDefaultSharedLibraries(name);

    function tryConstructFragment() {
      window.sharedLibraries.INITIALIZED_FRAGMENTS = window.sharedLibraries.INITIALIZED_FRAGMENTS || {};
      if (window.sharedLibraries.INITIALIZED_FRAGMENTS[name]) {
        return;
      }
      const missingLibs = getMissingDependencies(name);
      if (missingLibs.length === 0) {
        const mappedDeps = dependencies.map((dep) => window.sharedLibraries[name][dep]);
        factory(...mappedDeps);
        window.sharedLibraries.INITIALIZED_FRAGMENTS[name] = true;
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
    if (!window.sharedLibraries.LOADING_QUEUE) {
      window.sharedLibraries.LOADING_QUEUE = {};
    }
    if (!window.sharedLibraries.LOADING_QUEUE[fragment]) {
      window.sharedLibraries.LOADING_QUEUE[fragment] = {};
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
    window.sharedLibraries = window.sharedLibraries || {};
    window.sharedLibraries.GLOBAL_LIBS = window.sharedLibraries.GLOBAL_LIBS || { exports: {} };
    window.sharedLibraries.GLOBAL_LIBS_LOADING_QUEUE = window.sharedLibraries.GLOBAL_LIBS_LOADING_QUEUE || {};

    function tryConstructGlobalLib() {
      const missingDeps = dependencies.filter((dep) => !Object.keys(window.sharedLibraries.GLOBAL_LIBS).includes(dep));

      if (missingDeps.length === 0) {
        const lib = factory(...dependencies.map((dep) => window.sharedLibraries.GLOBAL_LIBS[dep]));
        if (name) {
          window.sharedLibraries.GLOBAL_LIBS[name] = lib;
        }

        const queueCallbacks = [...(window.sharedLibraries.GLOBAL_LIBS_LOADING_QUEUE[name] || [])];
        window.sharedLibraries.GLOBAL_LIBS_LOADING_QUEUE[name] = [];
        queueCallbacks.forEach((cb) => cb());
        return;
      }

      missingDeps.forEach((dep) => {
        window.sharedLibraries.GLOBAL_LIBS_LOADING_QUEUE[dep] =
          window.sharedLibraries.GLOBAL_LIBS_LOADING_QUEUE[dep] || [];
        window.sharedLibraries.GLOBAL_LIBS_LOADING_QUEUE[dep].push(tryConstructGlobalLib);
      });
    }

    tryConstructGlobalLib();
  }
}

define.amd = true;
