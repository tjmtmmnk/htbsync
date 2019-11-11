window.onload = async () => {
    const token = document.querySelector(".verifier");

    if ((token !== undefined && token !== null)) {
        await browser.runtime.sendMessage({
            "action": "getAccessToken",
            "verifier": token.innerText.replace(/\r?\n/g, "")
        });
    }
}