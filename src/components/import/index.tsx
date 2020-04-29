import { browser } from "webextension-polyfill-ts";
import { h } from "tsx-dom";
import { wetLayer } from "wet-layer";
import "typeface-open-sans";

import { on } from "../../frontend/htmlUtils";
import { loadJSONFile, readJSONFile } from "../../shared/fileHelper";
import "./style.scss";

wetLayer.loadFromStorage();

const dropzone = <div id="dropzone" />;
function onFileLoaded(json: any) {
    try {
        browser.runtime.sendMessage({ action: "importSettings", params: json });
        dropzone.textContent = wetLayer.getMessage("import_success_close_now");
    } catch (e) {
        console.log(e);
        dropzone.textContent = `${wetLayer.getMessage("import_failure")} ${wetLayer.getMessage(
            "import_by_drop_or_click"
        )}`;
    }
}
on(dropzone, "dragover", (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
    if (evt.dataTransfer) evt.dataTransfer.dropEffect = "copy";
});
on(dropzone, "drop", (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
    const file = evt.dataTransfer && evt.dataTransfer.files[0];
    file && readJSONFile(file, onFileLoaded);
});

on(dropzone, "click", (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
    loadJSONFile(onFileLoaded);
});
dropzone.textContent = wetLayer.getMessage("import_by_drop_or_click");
document.title = wetLayer.getMessage("extensionName");
document.body.appendChild(dropzone);
