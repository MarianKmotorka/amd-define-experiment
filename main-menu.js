define("main-menu", ["react", "react-dom"], (React, ReactDOM) => {
  console.log("MAIN MENU defined");

  let myElement = React.createElement(
    "div",
    { style: { border: "solid 2px red" } },
    React.createElement("h1", null, `MAIN MENU`),
    React.createElement("p", null, `React ${React.__version}, ReactDOM ${ReactDOM.__version}`)
  );

  ReactDOM.render(myElement, document.getElementById("main-menu-root"));
});
