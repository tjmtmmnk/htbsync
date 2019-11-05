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
    const BOOKMARK_URL = "https://bookmark.hatenaapis.com/rest/1/my/bookmark";
    oauth.authorize(() => {
        var request = {
            'method': 'GET',
            'parameters': {
                'url': 'http://pppurple.hatenablog.com/entry/2016/03/05/225723'
            }
        };
        oauth.sendSignedRequest(BOOKMARK_URL, (bookmarks) => console.log(bookmarks), request);
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