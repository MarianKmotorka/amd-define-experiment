define("nushop", ["react", "react-dom"], (React, ReactDOM) => {
  let myElement = React.createElement(
    "div",
    { className: "my-class" },
    React.createElement("h1", null, `NUSHOP, React ${React.__version}, ReactDOM ${ReactDOM.__version}`)
  );

  ReactDOM.createRoot(document.getElementById("nushop-root")).render(myElement);
});
