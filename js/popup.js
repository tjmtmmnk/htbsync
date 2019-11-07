window.onload = async () => {
    chrome.runtime.sendMessage({ action: 'getBookmarkBars' });

    chrome.runtime.onMessage.addListener(msg => {
        if (msg.action == "selectedBookmarkBars") {
            const select_box = document.getElementById('select-box-bookmark-bar');
            const bookmark_bars = msg.bookmark_bars;

            bookmark_bars.forEach(bookmark_bar => {
                let select_option = document.createElement('option');
                console.log(select_option);
                select_option.value = 'bookmark-bar-' + bookmark_bar.id;
                select_option.text = bookmark_bar.title;
                select_box.appendChild(select_option);
            });
        }
    });
};

document.addEventListener('DOMContentLoaded', async () => {
});