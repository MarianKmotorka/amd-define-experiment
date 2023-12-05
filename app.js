define(["react", "react-dom"], (React, ReactDOM) => {
  // const React = window.sharedLibraries["nushop"]["react"];
  // const ReactDOM = window.sharedLibraries["nushop"]["react-dom"];

  let myElement = React.createElement(
    "div",
    { className: "my-class" },
    React.createElement("h1", null, "Hello, React 18!"),
    React.createElement("p", null, "This is a paragraph.")
  );

  ReactDOM.createRoot(document.getElementById("root")).render(myElement);
});
