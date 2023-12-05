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

  const fragmentName = currentScriptTag.dataset.fragmentName;
  if (fragmentName) {
    initializeSharedLibraries(fragmentName);

    function tryConstructFragment() {
      const missingLibs = getMissingLibraries(fragmentName);
      if (missingLibs.length === 0) {
        const mappedDeps = dependencies.map((dep) => window.sharedLibraries[fragmentName][dep]);
        factory(...mappedDeps);
      }
    }
    tryConstructFragment();

    function handleLoadedEvent({ detail }) {
      if (detail.fragment === fragmentName) {
        tryConstructFragment();
      }
    }
    window.addEventListener("shared-library-loaded", handleLoadedEvent);
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
    initializeSharedLibraries(fragment);

    if (!window.sharedLibrariesQueue) {
      window.sharedLibrariesQueue = {};
    }
    if (!window.sharedLibrariesQueue[fragment]) {
      window.sharedLibrariesQueue[fragment] = {};
    }

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
        defineVersionAndAliases(fragment);
        dispatchLoadedEvent(fragment);
        return;
      }

      const missingLibraries = getMissingLibraries(fragment);

      if (missingLibraries.length === 0) {
        constructModule(fragment);
        defineVersionAndAliases(fragment);
        dispatchLoadedEvent(fragment);

        const queueCallbacks = [...(window.sharedLibrariesQueue[fragment][libraryName] || [])];
        window.sharedLibrariesQueue[fragment][libraryName] = [];
        queueCallbacks.forEach((cb) => cb());
        return;
      }

      missingLibraries.forEach((lib) => {
        if (!window.sharedLibrariesQueue[fragment][lib]) {
          window.sharedLibrariesQueue[fragment][lib] = [];
        }
        window.sharedLibrariesQueue[fragment][lib] = [...window.sharedLibrariesQueue[fragment][lib], defineLibrary];
      });
    }

    defineLibrary();
  });

  function initializeSharedLibraries(fragment) {
    if (!window.sharedLibraries) {
      window.sharedLibraries = {};
    }
    if (!window.sharedLibraries[fragment]) {
      window.sharedLibraries[fragment] = {};
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

  function getMissingLibraries(fragment) {
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
}

define.amd = true;
