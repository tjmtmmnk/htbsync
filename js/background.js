chrome.browserAction.onClicked.addListener((tab) => {
    chrome.bookmarks.getTree((trees) => {
        trees.forEach((tree) => {
            const bookmark_bars = tree.children;
            var prev = -1;
            var mainly_bookmark_bar_id;
            bookmark_bars.forEach((bookmark_bar) => {
                if (prev < bookmark_bar.children.length) {
                    mainly_bookmark_bar_id = bookmark_bar.id;
                }
                prev = bookmark_bar.children.length;
            });

            chrome.bookmarks.create({
                'parentId': mainly_bookmark_bar_id,
                'title': 'Extension bookmarks2'
            },
                function (newFolder) {
                    console.log("added folder: " + newFolder.title);
                });
        });
    });
});