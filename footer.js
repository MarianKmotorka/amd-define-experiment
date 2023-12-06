define("footer", ["react", "react-dom"], (React, ReactDOM) => {
  console.log("FOOTER defined");

  let myElement = React.createElement(
    "div",
    { style: { border: "solid 2px black", marginTop: 16 } },
    React.createElement("h1", null, `FOOTER`),
    React.createElement("p", null, `React ${React.__version}, ReactDOM ${ReactDOM.__version}`)
  );

  ReactDOM.createRoot(document.getElementById("footer-root")).render(myElement);
});
