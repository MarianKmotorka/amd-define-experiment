define(["react", "react-dom"], (React, ReactDOM) => {
  let myElement = React.createElement(
    "div",
    { className: "my-class" },
    React.createElement("h1", null, `Hello, MAIN MENU, React ${React.__version}!`)
  );

  ReactDOM.createRoot(document.getElementById("main-menu-root")).render(myElement);
});
