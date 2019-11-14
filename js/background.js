const CONSUMER_KEY = "xxx";
const CONSUMER_SECRET = "xxx";

const BOOKMARK_FOLDER = 'Import from hatena bookmark';
const BOOKMARK_URL = "https://b.hatena.ne.jp/my/search.data";
const USERINFO_URL = "https://bookmark.hatenaapis.com/rest/1/my";

const OAUTH_REQUEST_URL = "https://www.hatena.com/oauth/initiate";
const OAUTH_AUTHORIZE_URL = "https://www.hatena.ne.jp/oauth/authorize";
const OAUTH_ACCESS_URL = "https://www.hatena.com/oauth/token";

const oauth = ChromeExOAuth.initBackgroundPage({
    'request_url': OAUTH_REQUEST_URL,
    'authorize_url': OAUTH_AUTHORIZE_URL,
    'access_url': OAUTH_ACCESS_URL,
    'consumer_key': CONSUMER_KEY,
    'consumer_secret': CONSUMER_SECRET,
    'scope': 'read_public,read_private',
    'app_name': 'htbsync'
});

chrome.runtime.onMessage.addListener((msg, sender) => {
    switch (msg.action) {
        case 'getAccessToken':
            const request_token = oauth.getReqToken();

            oauth.getAccessToken(request_token, msg.verifier, () => { });
            chrome.tabs.remove(sender.tab.id);
            break;
        case 'getBookmarkBars':
            (async () => {
                const bookmark_bars_node = await browser.bookmarks.getTree();

                chrome.runtime.sendMessage({
                    action: 'selectedBookmarkBars',
                    bookmark_bars: bookmark_bars_node[0].children
                });
            })();
            break;
        case 'importHatebu':
            oauth.authorize(() => {
                importHatebuToBrowser();
            });
            break;
        case 'logout':
            oauth.clearTokens();
            alert('Logout');
            break;
    }
});

async function importHatebuToBrowser() {
    try {
        const bookmark_bar_id = await getBookmarkBarId();
        const folder_id = await createBookmarkFolder(bookmark_bar_id);
        const hatebu_list = await fetchHatebuList();
        // ブックマークフォルダが存在しない時にdeleteから実行するとエラーになる
        await createBookmarkFromHatebuList(folder_id, hatebu_list);
        await deleteBookmarkNotInHatebuList(folder_id, hatebu_list);
    } catch (err) {
        console.log(err);
    }
}

async function fetchHatebuList() {
    return new Promise(resolve => {
        if (oauth.hasToken()) {
            const request = {
                'method': 'GET',
                'parameters': {}
            };
            oauth.sendSignedRequest(BOOKMARK_URL, async hatebu_list => {
                const parsed_hatebu_list = await parseHatenaBookmarkRawData(hatebu_list);
                resolve(parsed_hatebu_list);
            }, request);
        }
    });
}

async function importHatebu(folder_id) {
    if (oauth.hasToken()) {
        const request = {
            'method': 'GET',
            'parameters': {}
        };
        oauth.sendSignedRequest(BOOKMARK_URL, async hatebu_list => {
            const parsed_hatebu_list = await parseHatenaBookmarkRawData(hatebu_list);
            // ブックマークフォルダが存在しない時にdeleteから実行するとエラーになる
            await createBookmarkFromHatebuList(folder_id, parsed_hatebu_list);
            await deleteBookmarkNotInHatebuList(folder_id, parsed_hatebu_list);
        }, request);
    }
}

async function createBookmarkFromHatebuList(folder_id, parsed_hatebu_list) {
    const trash_folder_node = await browser.bookmarks.getTree();
    const trash_folder = trash_folder_node[0].children.filter(folder => folder.trash);
    const trash_folder_id = trash_folder.length == 0 ? -1 : trash_folder[0].id;

    parsed_hatebu_list.forEach(async hatebu => {
        const exist_bookmarks = await browser.bookmarks.search({ url: hatebu.url });
        const bookmarks_exclude_trash = exist_bookmarks.filter(bookmark => !bookmark.trash && bookmark.parentId != trash_folder_id);
        if (bookmarks_exclude_trash.length == 0) {
            createBookmark(folder_id, hatebu);
        }
    });
}

async function deleteBookmarkNotInHatebuList(folder_id, parsed_hatebu_list) {
    const folder_node = await browser.bookmarks.getSubTree(folder_id);
    const bookmarks_in_folder = folder_node[0].children;
    bookmarks_in_folder.forEach(bookmark => {
        const is_delete = (parsed_hatebu_list.filter(hatebu => hatebu.url == bookmark.url).length == 0);
        if (is_delete) {
            browser.bookmarks.remove(bookmark.id);
        }
    });
}

async function getBookmarkBarId() {
    const bookmark_bar_id_hash = await browser.storage.local.get('bookmark_bar_id').catch(err => { throw err });
    return bookmark_bar_id_hash.bookmark_bar_id;
}

async function createBookmarkFolder(bookmark_bar_id) {
    return new Promise(resolve => {
        if (oauth.hasToken()) {
            const request = {
                'method': 'GET',
                'parameters': {}
            };
            oauth.sendSignedRequest(USERINFO_URL, async user_str => {
                const user = JSON.parse(user_str);
                const bookmark_folder_title = user.name + ' ' + BOOKMARK_FOLDER;

                const query_for_bookmark_folder = {
                    'title': bookmark_folder_title,
                    'url': null
                };
                const folders = await browser.bookmarks.search(query_for_bookmark_folder);
                const folders_exclude_trash = folders.filter(folder => !folder.trash && folder.parentId == bookmark_bar_id);

                const create_folder = folders_exclude_trash.length == 0;

                if (create_folder) {
                    const new_folder = await browser.bookmarks.create({
                        'parentId': bookmark_bar_id,
                        'title': bookmark_folder_title
                    });
                    resolve(new_folder.id);
                } else {
                    resolve(folders_exclude_trash[0].id);
                }
            }, request);
        }
    });
}

/**
 * @param {number} folder_id
 * @param {{title: "string", comment: "string", url: "string", date: new Date()}} hatena_bookmarks
 */
function createBookmark(folder_id, hatebu) {
    const extracted_tags = extractHatebuTags(hatebu);
    const title = extracted_tags === null ? hatebu.title : extracted_tags + ' ' + hatebu.title;

    const bookmark = {
        parentId: folder_id,
        url: hatebu.url,
        title: title
    };
    console.log("create " + hatebu.url);
    browser.bookmarks.create(bookmark);
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
 * @returns {Promise<{title: "string", comment: "string", url: "string", date: new Date()} []>}
 */
async function parseHatenaBookmarkRawData(text) {
    if (text == null) {
        return [];
    }
    var myDataTuple = parseLineByLine(text);
    if (myDataTuple.bookmarks.length === 0 || myDataTuple.lines.length === 0) {
        return [];
    }
    const parsed_hatebu_list = myDataTuple.lines.map((metaInfo, index) => {
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
    return parsed_hatebu_list;
}

function extractHatebuTags(hatebu) {
    return hatebu.comment.match(/^\[.+\]/);
}
