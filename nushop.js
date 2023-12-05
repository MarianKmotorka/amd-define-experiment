define(["react", "react-dom"], (React, ReactDOM) => {
  let myElement = React.createElement(
    "div",
    { className: "my-class" },
    React.createElement("h1", null, `Hello, NUSHOP, React ${React.__version}!`)
  );

  ReactDOM.render(myElement, document.getElementById("nushop-root"));
});
