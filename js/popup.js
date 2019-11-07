document.addEventListener('DOMContentLoaded', () => {
    chrome.runtime.sendMessage({ action: 'getBookmarkBars' });

    chrome.runtime.onMessage.addListener(msg => {
        if (msg.action == "selectedBookmarkBars") {
            const select_box = document.getElementById('select-box-bookmark-bar');
            const bookmark_bars = msg.bookmark_bars;

            bookmark_bars.forEach(bookmark_bar => {
                let select_option = document.createElement('option');
                select_option.value = bookmark_bar.id;
                select_option.text = bookmark_bar.title;
                select_box.appendChild(select_option);
            });
        }
    });

    document.getElementById('select-button').addEventListener('click', () => {
        const bookmark_bar_id = document.getElementById('select-box-bookmark-bar').value;
        chrome.runtime.sendMessage({
            action: 'setBookmarkBarID',
            id: bookmark_bar_id
        });
    });

    document.getElementById('import').addEventListener('click', () => {
        chrome.runtime.sendMessage({
            action: 'importHatebu'
        });
    });
});