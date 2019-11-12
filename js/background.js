const BOOKMARK_FOLDER = 'Import from hatena bookmark';
const CONSUMER_KEY = "xxx";
const CONSUMER_SECRET = "xxx";

const BOOKMARK_URL = "https://b.hatena.ne.jp/my/search.data";

const oauth = ChromeExOAuth.initBackgroundPage({
    'request_url': 'https://www.hatena.com/oauth/initiate',
    'authorize_url': 'https://www.hatena.ne.jp/oauth/authorize',
    'access_url': 'https://www.hatena.com/oauth/token',
    'consumer_key': CONSUMER_KEY,
    'consumer_secret': CONSUMER_SECRET,
    'scope': 'read_public',
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
            importHatebuToBrowser();
            break;
    }
});

async function importHatebuToBrowser() {
    try {
        const bookmark_bar_id = await getBookmarkBarId();
        const folder_id = await createBookmarkFolder(bookmark_bar_id);

        oauth.authorize(() => {
            const request = {
                'method': 'GET',
                'parameters': {}
            };
            oauth.sendSignedRequest(BOOKMARK_URL, async hatebu_list => {
                const parsed_hatebu_list = await parseHatenaBookmarkRawData(hatebu_list);
                createBookmarkFromHatebuList(folder_id, parsed_hatebu_list);
                deleteBookmarkNotInHatebuList(folder_id, parsed_hatebu_list);
            }, request);
        });
    } catch (err) {
        console.log(err);
    }
}

async function createBookmarkFromHatebuList(folder_id, parsed_hatebu_list) {
    const trash_folder_node = await browser.bookmarks.getTree();
    const trash_folder = trash_folder_node[0].children.filter(folder => folder.trash)[0];

    parsed_hatebu_list.forEach(async hatebu => {
        const exist_bookmarks = await browser.bookmarks.search({ url: hatebu.url });

        const bookmarks_exclude_trash = exist_bookmarks.filter(bookmark => !bookmark.trash && bookmark.parentId != trash_folder.id);
        if (bookmarks_exclude_trash.length == 0) {
            console.log("create " + hatebu.url);
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
            console.log("delete " + bookmark.url);
            browser.bookmarks.remove(bookmark.id);
        }
    });
}

async function getBookmarkBarId() {
    const bookmark_bar_id_hash = await browser.storage.local.get('bookmark_bar_id').catch(err => { throw err });
    return bookmark_bar_id_hash.bookmark_bar_id;
}

async function createBookmarkFolder(bookmark_bar_id) {
    const query_for_bookmark_folder = {
        'title': BOOKMARK_FOLDER,
        'url': null
    };
    const folders = await browser.bookmarks.search(query_for_bookmark_folder);
    const folders_exclude_trash = folders.filter(folder => !folder.trash && folder.parentId == bookmark_bar_id);

    const create_folder = folders_exclude_trash.length == 0;
    if (create_folder) {
        const new_folder = await browser.bookmarks.create({
            'parentId': bookmark_bar_id,
            'title': BOOKMARK_FOLDER
        }).catch(err => { throw err });
        return new_folder.id;
    } else {
        return folders_exclude_trash[0].id;
    }
}

/**
 * @param {number} folder_id
 * @param {{title: "string", comment: "string", url: "string", date: new Date()}} hatena_bookmarks
 */
function createBookmark(folder_id, hatebu) {
    const extracted_tags = this.extractHatebuTags(hatebu);
    const title = extracted_tags === null ? hatebu.title : extracted_tags + ' ' + hatebu.title;

    const bookmark = {
        parentId: folder_id,
        url: hatebu.url,
        title: title
    };
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
