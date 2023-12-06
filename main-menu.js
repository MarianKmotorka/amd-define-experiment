define("main-menu", ["react", "react-dom"], (React, ReactDOM) => {
  let myElement = React.createElement(
    "div",
    { className: "my-class" },
    React.createElement("h1", null, `MAIN MENU, React ${React.__version}, ReactDOM ${ReactDOM.__version}`)
  );

  ReactDOM.render(myElement, document.getElementById("main-menu-root"));
});
