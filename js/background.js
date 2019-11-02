chrome.browserAction.onClicked.addListener((tab) => {
    chrome.bookmarks.getTree((trees) => {
        trees.forEach((tree) => {
            const bookmark_bars = tree.children;
            const mainly_bookmark_bar_id = get_mainly_bookmark_bar_id(bookmark_bars);
            create_bookmark_folder(mainly_bookmark_bar_id);
        });
    });
});

function create_bookmark_folder(bookmark_bar_id) {
    chrome.bookmarks.search({ 'title': 'Extension bookmarks2' }, (folders) => {
        console.log(folders);
        const folders_exclude_trash = folders.filter((folder) => !folder.trash && folder.parentId == bookmark_bar_id);
        const not_create_folder = folders_exclude_trash.length == 1;
        if (not_create_folder) {
            console.log("already exist");
        } else {
            chrome.bookmarks.create({
                'parentId': bookmark_bar_id,
                'title': 'Extension bookmarks2'
            },
                function (newFolder) {
                    console.log("added folder: " + newFolder.title);
                });
        }
    });
}

function get_mainly_bookmark_bar_id(bookmark_bars) {
    var prev = -1;
    var mainly_bookmark_bar_id;
    bookmark_bars.forEach((bookmark_bar) => {
        if (!bookmark_bar.trash) {
            if (prev < bookmark_bar.children.length) {
                mainly_bookmark_bar_id = bookmark_bar.id;
            }
            prev = bookmark_bar.children.length;
        }
    });
    return mainly_bookmark_bar_id;
}