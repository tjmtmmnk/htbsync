const BOOKMARK_FOLDER = 'Import from hatena bookmark';
const CONSUMER_KEY = "xxx";
const CONSUMER_SECRET = "xxx";

var oauth = ChromeExOAuth.initBackgroundPage({
    'request_url': 'https://www.hatena.com/oauth/initiate',
    'authorize_url': 'https://www.hatena.ne.jp/oauth/authorize',
    'access_url': 'https://www.hatena.com/oauth/token',
    'consumer_key': CONSUMER_KEY,
    'consumer_secret': CONSUMER_SECRET,
    'scope': 'read_public',
    'app_name': 'htbsync'
});

chrome.browserAction.onClicked.addListener((tab) => {
    // chrome.bookmarks.getTree((trees) => {
    //     const bookmark_bars = trees[0].children;
    //     const mainly_bookmark_bar_id = get_mainly_bookmark_bar_id(bookmark_bars);
    //     create_bookmark_folder(mainly_bookmark_bar_id);
    // });
    getBookmarks();
});

chrome.runtime.onMessage.addListener((msg, sender, response) => {
    if (msg.action == "getAccessToken") {
        const reqToken = oauth.getReqToken();
        console.log(reqToken);
        console.log(encodeURIComponent(msg.verifier));
        oauth.getAccessToken(reqToken, encodeURIComponent(msg.verifier), getBookmarks);
        chrome.tabs.remove(sender.tab.id, () => { });
    }
});

function getBookmarks() {
    const BOOKMARK_URL = "https://b.hatena.ne.jp/my/search.data";
    oauth.authorize(() => {
        var request = {
            'method': 'GET',
            'parameters': {}
        };
        oauth.sendSignedRequest(BOOKMARK_URL, (bookmarks) => {
            const parsed = parse(bookmarks);
            console.log(parsed)
        }, request);
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

// TODO: Promise実装
function create_bookmark_folder(bookmark_bar_id) {
    const query_for_bookmark_folder = {
        'title': BOOKMARK_FOLDER,
        'url': null
    };
    chrome.bookmarks.search(query_for_bookmark_folder, (folders) => {
        const folders_exclude_trash = folders.filter((folder) => !folder.trash && folder.parentId == bookmark_bar_id);
        const create_folder = folders_exclude_trash.length == 0;
        if (create_folder) {
            chrome.bookmarks.create({
                'parentId': bookmark_bar_id,
                'title': BOOKMARK_FOLDER
            },
                (new_folder) => create_bookmarks(new_folder.id)
            );
        } else {
            console.log("already exist");
        }
    });
}

function create_bookmarks(bookmark_folder_id) {
    chrome.bookmarks.create({
        'parentId': bookmark_folder_id,
        'title': 'dev',
        'url': 'https://developer.chrome.com/extensions/bookmarks#method-search'
    }, () => console.log("create with in folder"));
}

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
 * search.dataについては`/doc/search.data-format.md`を参照
 *
 * @param {string} text
 * @returns {
    title: "string",
    comment: "string",
    url: "string",
    date: new Date()
} Date
 */
function parse(text) {
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