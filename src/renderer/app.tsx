import * as React from "react";
import * as ReactDOM from "react-dom";
import { Config } from "./helpers/configSingleton";

import TitleBar from "./components/TitleBar/TitleBar";
import ViewContainer from "./components/ViewContainer/ViewContainer";
import "./app.css";

// Create main element
const mainElement = document.createElement("div");
mainElement.classList.add("root");
document.body.appendChild(mainElement);

// Instantiates the config if it hasn't been
Config().refresh();

const render = () => {
    ReactDOM.render(
        <React.StrictMode>
            <TitleBar />
            <ViewContainer />
        </React.StrictMode>,
        mainElement
    );
};

render();
