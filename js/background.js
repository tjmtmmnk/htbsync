const BOOKMARK_FOLDER = 'Import from hatena bookmark';
const CONSUMER_KEY = "xxx";
const CONSUMER_SECRET = "xxx";

var oauth = ChromeExOAuth.initBackgroundPage({
const BOOKMARK_URL = "https://b.hatena.ne.jp/my/search.data";
const BOOKMARK_ID = '1';
const oauth = ChromeExOAuth.initBackgroundPage({
    'request_url': 'https://www.hatena.com/oauth/initiate',
    'authorize_url': 'https://www.hatena.ne.jp/oauth/authorize',
    'access_url': 'https://www.hatena.com/oauth/token',
    'consumer_key': CONSUMER_KEY,
    'consumer_secret': CONSUMER_SECRET,
    'scope': 'read_public',
    'app_name': 'htbsync'
});

chrome.runtime.onMessage.addListener((msg, sender, response) => {
    if (msg.action == "getAccessToken") {
        const reqToken = oauth.getReqToken();
        oauth.getAccessToken(reqToken, encodeURIComponent(msg.verifier), () => { });
        chrome.tabs.remove(sender.tab.id, () => { });
    }
});

chrome.browserAction.onClicked.addListener(() => {
    var folder_id;
    createBookmarkFolder(BOOKMARK_ID)
        .then((new_folder_id) => { folder_id = new_folder_id })
        .catch((exist_folder_id) => { folder_id = exist_folder_id });

    oauth.authorize(() => {
        const request = {
            'method': 'GET',
            'parameters': {}
        };
        oauth.sendSignedRequest(BOOKMARK_URL, (bookmarks) => {
            const parsed_hatebu = parseHatenaBookmarkRawData(bookmarks);
            parsed_hatebu.forEach((hatebu) => {
                browser.bookmarks.search({ url: hatebu.url })
                    .then((bookmarks) => {
                        // parentIdで絞ると、階層的に2階層以上のブックマークのparentIdがわからなくなるので絞っていない
                        const bookmarks_exclude_trash = bookmarks.filter((bookmark) => !bookmark.trash);
                        if (bookmarks_exclude_trash.length == 0) {
                            console.log("create " + hatebu.url);
                            createBookmark(folder_id, hatebu);
                        }
                    });
            });
        }, request);
    });
});

function createBookmarkFolder(bookmark_bar_id) {
    return new Promise((resolve, reject) => {
        const query_for_bookmark_folder = {
            'title': BOOKMARK_FOLDER,
            'url': null
        };
        browser.bookmarks.search(query_for_bookmark_folder)
            .then((folders) => {
                const folders_exclude_trash = folders.filter((folder) => !folder.trash && folder.parentId == bookmark_bar_id);
                const create_folder = folders_exclude_trash.length == 0;
                if (create_folder) {
                    browser.bookmarks.create({
                        'parentId': bookmark_bar_id,
                        'title': BOOKMARK_FOLDER
                    })
                        .then(
                            (new_folder) => resolve(new_folder.id)
                        )
                        .catch(
                            (err) => console.log(err)
                        );
                } else {
                    reject(folders_exclude_trash[0].id);
                }
            });
    });
}

/**
 * @param {number} folder_id
 * @param {{title: "string", comment: "string", url: "string", date: new Date()}} hatena_bookmarks
 */
function createBookmark(folder_id, hatebu) {
    const bookmark = {
        parentId: folder_id,
        url: hatebu.url,
        title: hatebu.title
    };
    chrome.bookmarks.create(bookmark);
}

// はてなブックマーク parserライブラリ
/**
 * create Date object from yyyymmddhhmmss string
 * @param {string} dateStr yyyymmddhhmmss
 * @returns {Date}
 */
function dateFromString(dateStr) {
    // dateStr
    // yyyymmddhhmmss
    return new Date(
        dateStr.substring(0, 4),
        parseInt(dateStr.substr(4, 2), 10) - 1,
        dateStr.substr(6, 2),
        dateStr.substr(8, 2),
        dateStr.substr(10, 2),
        dateStr.substr(12, 2)
    );
}
/**
 * create tuple that
 * @param text
 * @returns {{bookmarks: string[], lines: string[]}}
 */
function parseLineByLine(text) {
    var lines = text.trim().split("\n");
    var bookmarks = lines.splice(0, lines.length * 3 / 4);
    return {
        bookmarks: bookmarks,
        lines: lines
    };
}

/**
 * @param {string} text
 * @returns {{title: "string", comment: "string", url: "string", date: new Date()} []}
 */
function parseHatenaBookmarkRawData(text) {
    if (text == null) {
        return [];
    }
    var myDataTuple = parseLineByLine(text);
    if (myDataTuple.bookmarks.length === 0 || myDataTuple.lines.length === 0) {
        return [];
    }
    return myDataTuple.lines.map(function (metaInfo, index) {
        var bIndex = index * 3;
        var timestamp = metaInfo.split("\t", 2)[1];
        var title = myDataTuple.bookmarks[bIndex];
        var comment = myDataTuple.bookmarks[bIndex + 1];
        var url = myDataTuple.bookmarks[bIndex + 2];
        return {
            title: title,
            comment: comment,
            url: url,
            date: dateFromString(timestamp)
        }
    });
}
