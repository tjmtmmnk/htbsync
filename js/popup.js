document.addEventListener('DOMContentLoaded', async () => {
    const select_box = document.getElementById('select-box-bookmark-bar');
    const select_button = document.getElementById('select-button');
    const import_button = document.getElementById('import');

    const cached_bookmark_bar_id = await browser.storage.local.get('bookmark_bar_id');
    if (cached_bookmark_bar_id === undefined) {
        await chrome.runtime.sendMessage({ action: 'getBookmarkBars' });
    } else {
        select_box.hidden = true;
        select_button.hidden = true;
    }

    chrome.runtime.onMessage.addListener(msg => {
        if (msg.action == "selectedBookmarkBars") {
            const bookmark_bars = msg.bookmark_bars;

            bookmark_bars.forEach(bookmark_bar => {
                let select_option = document.createElement('option');
                select_option.value = bookmark_bar.id;
                select_option.text = bookmark_bar.title;
                select_box.appendChild(select_option);
            });

            select_button.innerText = select_box.options[select_box.selectedIndex].text + 'を選択';
        }
    });

    select_box.addEventListener('change', () => {
        select_button.innerText = select_box.options[select_box.selectedIndex].text + 'を選択';
    });

    select_button.addEventListener('click', () => {
        const bookmark_bar_id = select_box.value;
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