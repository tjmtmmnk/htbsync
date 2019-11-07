document.addEventListener('DOMContentLoaded', async () => {
    const select_box = document.getElementById('select-box-bookmark-bar');
    const import_button = document.getElementById('import');

    const cached_bookmark_bar_id = await browser.storage.local.get('bookmark_bar_id');
    await chrome.runtime.sendMessage({ action: 'getBookmarkBars' });
    // if (cached_bookmark_bar_id.bookmark_bar_id === undefined) {
    //     await chrome.runtime.sendMessage({ action: 'getBookmarkBars' });
    // } else {
    //     select_box.hidden = true;
    // }

    chrome.runtime.onMessage.addListener(msg => {
        if (msg.action == "selectedBookmarkBars") {
            const bookmark_bars = msg.bookmark_bars;

            bookmark_bars.forEach(bookmark_bar => {
                let select_option = document.createElement('option');
                select_option.value = bookmark_bar.id;
                select_option.text = bookmark_bar.title;
                select_box.appendChild(select_option);
            });
        }
    });

    select_box.addEventListener('change', () => {
        const bookmark_bar_id = cached_bookmark_bar_id ? cached_bookmark_bar_id.bookmark_bar_id : select_box.value;
        chrome.runtime.sendMessage({
            action: 'setBookmarkBarID',
            id: bookmark_bar_id
        });
    });

    import_button.addEventListener('click', () => {
        chrome.runtime.sendMessage({
            action: 'importHatebu'
        });
    });
});