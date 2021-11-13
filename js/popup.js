document.addEventListener('DOMContentLoaded', async () => {
    const select_box = document.getElementById('bookmark-bar-select-box');
    const sync_button = document.getElementById('sync-button');
    const logout_button = document.getElementById('logout-button');

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

    sync_button.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'syncHatebu' });
    });

    logout_button.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'logout' });
    });
});
