document.addEventListener('DOMContentLoaded', async () => {
    const keys = await browser.storage.local.get(['consumer_key', 'consumer_secret']);
    const is_set_consumer_key = keys.consumer_key !== undefined && keys.consumer_secret !== undefined;
    if (!is_set_consumer_key) {
        alert('Please set your consumer key in option page');
        chrome.runtime.openOptionsPage();
        window.close();
    }

    const select_box = document.getElementById('select-box-bookmark-bar');
    const import_button = document.getElementById('import');
    const logout_button = document.getElementById('logout');

    await browser.runtime.sendMessage({
        action: 'getBookmarkBars'
    });

    chrome.runtime.onMessage.addListener(async msg => {
        if (msg.action == "selectedBookmarkBars") {
            const bookmark_bars = msg.bookmark_bars;
            console.log(bookmark_bars);
            // ブックマークバーのデフォルト値を設定
            if (bookmark_bars.length > 0) {
                await browser.storage.local.set({ 'bookmark_bar_id': bookmark_bars[0].id });
            }

            bookmark_bars.forEach(bookmark_bar => {
                let select_option = document.createElement('option');
                select_option.value = bookmark_bar.id;
                select_option.text = bookmark_bar.title;
                select_box.appendChild(select_option);
            });
        }
    });

    select_box.addEventListener('change', () => {
        chrome.storage.local.set({ 'bookmark_bar_id': select_box.value });
    });

    import_button.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'importHatebu' });
    });

    logout_button.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'logout' });
    });
});