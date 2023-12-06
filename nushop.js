define("nushop", ["react", "react-dom"], (React, ReactDOM) => {
  console.log("NUSHOP defined");

  let myElement = React.createElement(
    "div",
    { style: { border: "solid 2px green", marginTop: 16 } },
    React.createElement("h1", null, `NUSHOP`),
    React.createElement("p", null, `React ${React.__version}, ReactDOM ${ReactDOM.__version}`)
  );

  ReactDOM.createRoot(document.getElementById("nushop-root")).render(myElement);
});
