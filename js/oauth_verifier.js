window.onload = () => {
    const token = document.querySelector(".verifier");

    if ((token !== undefined && token !== null)) {
        browser.runtime.sendMessage({
            "action": "getAccessToken",
            "verifier": token.innerText.replace(/\r?\n/g, "")
        });
    }
}