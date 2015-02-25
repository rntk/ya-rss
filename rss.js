/*global window: true, document: true, $: true, alert: true*/
/*jslint plusplus: true */
/*jslint maxerr: 1000 */
'use strict';
var app = {
    token: '',
    id: '', //здесь вставлять id
    colors: {'a': '#f3f3f3', 'p': '#ffffff', 'r': '#bcbcbc'},
    groups: {},
    posts: [],
    posts_queue: [],
    current_feed: '',
    current_group: '',
    current_post: 0,
    worker: {},
    worker_init: false,
    view_type: 'title_type', // title_type or full_type
    all_group: false,
    url: 'request.php',
    no_category_name: 'NoCategory',
    start: function () {
        this.getToken();
        return this.token !== '';
    },
    getToken: function () {
        var c = document.cookie.match(new RegExp('token=([0-9A-Za-z]*)(; |$)')),
            t;
        this.token = c ? c[1] : '';
        if (this.token === '') {
            t = window.location.toString().match(new RegExp('access_token=([a-zA-Z0-9]*)(&|$)'));
            if (t) {
                this.token = t[1];
                document.cookie = 'token=' + this.token;
                window.location = 'http://' + window.location.host + window.location.pathname;
            } else {
                window.location = 'https://oauth.yandex.ru/authorize?response_type=token&client_id=' + this.id + '&request_uri=' + window.location;
            }
        }
    },
    getHash: function (name) {
        var title = 'g',
            chr;
        for (chr = 0; chr < name.length; chr++) {
            title += name.charCodeAt(chr);
        }
        return title;
    },
    setGroups: function ($groups) {
        var app = this,
            $feeds,
            title,
            name;
        if ($groups) {
            $groups.each(function () {
                var $this = $(this);
                name = $this.children('title').eq(0).text();
                title = app.getHash(name);
                app.groups[title] = {
                    'name': name,
                    'unread_count': +$this.attr('unread_count'),
                    'group_id': $this.attr('group_id'),
                    'feeds': {}
                };
                $feeds = $this.find('feed');
                app.setFeeds($feeds, title);
            });
        } else {
            name = this.no_category_name;
            title = app.getHash(name);
            app.groups[title] = {
                'name': name,
                'unread_count': 0,
                'group_id': -1,
                'feeds': {}
            };
        }
        return title;
    },
    setFeeds: function ($feeds, title) {
        var app = this;
        $feeds.each(function () {
            var $this = $(this),
                md5;
            if (parseInt($this.attr('unread_count'), 10) > 0) {
                md5 = $this.find('md5').text();
                app.groups[title].feeds[md5] = {
                    'unread_count': $this.attr('unread_count'),
                    'title': $this.find('title').text()
                };
                if (app.groups[title].group_id === -1) {
                    app.groups[title].unread_count += +app.groups[title].feeds[md5].unread_count;
                }
            }
        });
    },
    getGroups: function (first, result) {
        var $feeds,
            $grs,
            title;
        if (first) {
            $.ajax({
                url: app.url,
                type: "GET",
                data: {
                    'method': 'GET',
                    'url': '/subscriptions',
                    'token': app.token,
                    'data': '0'
                },
                dataType: "json",
                async: true,
                success: function (x) {
                    app.getGroups(false, x);
                }
            });
        } else {
            if (result.status === 200) {
                $grs = $(result.data).find('group');
                this.setGroups($grs);
                $feeds = $(result.data).children('feed');
                if (($feeds.length) > 0) {
                    title = this.setGroups();
                    this.setFeeds($feeds, title);
                }
                this.showGroups();
            } else {
                alert('Something wrong with Groups access');
            }
        }
    },
    getPosts: function (first, all, result, callback) {
        var clbck = callback,
            unread_count,
            $psts,
            u;
        if (first) {
            if (all && (app.groups[app.current_group].group_id !== -1)) {
                unread_count = app.groups[app.current_group].unread_count;
                u = '/posts?group_id=' + app.groups[app.current_group].group_id + '&read_status=unread&items_per_page=';
            } else {
                unread_count = app.groups[app.current_group].feeds[app.current_feed].unread_count;
                u = '/posts?md5=' + app.current_feed + '&read_status=unread&items_per_page=';
            }
            if (unread_count > 100) {
                unread_count = 100;
            }
            u += unread_count;
            $.ajax({
                url: app.url,
                type: "GET",
                data: {
                    'method': 'GET',
                    'url': u,
                    'token': app.token,
                    'data': '0'
                },
                dataType: "json",
                async: true,
                success: function (x) {
                    app.getPosts(false, false, x, clbck);
                }
            });
        } else {
            app.posts = [];
            if (result.status === 200) {
                $psts = $(result.data).find('post');
                $psts.each(function (i) {
                    var $this = $(this),
                        $entry = $this.find('entry').eq(0),
                        id = $this.attr('id');
                    app.posts[i] = {
                        'meta': $this.find('meta').attr('href'),
                        'id': id,
                        'feed': id.substring(0, id.indexOf('.')),
                        'content': $entry.find('content').html(),
                        'link': $entry.find('link').attr('href'),
                        'author': $entry.find('author').text(),
                        'date': $entry.find('issued').text(),
                        'read': false,
                        'title': $entry.find('title').text()
                    };
                    if (app.posts[i].title === '') {
                        app.posts[i].title = 'No title';
                    }
                });
                callback();
            } else {
                alert('Something wrong with Groups access ' + result.status + result.reason);
            }
        }
    },
    setPostStatus: function (status, all, all_posts) {
        var mark,
            feed,
            i;
        if (all) {
            if (all_posts) {
                $('.post').each(function () {
                    app.posts_queue.push({
                        'mark': '<post id="' + app.posts[$(this).attr('id')].id + '"><' + status + '/></post>',
                        'url': app.posts[$(this).attr('id')].meta
                    });
                });
            } else {
                mark = [];
                if (this.all_group) {
                    if (this.groups[this.current_group].group_id !== -1) {
                        mark.push('<read><group_id>' + this.groups[this.current_group].group_id + '</group_id></read>');
                    } else {
                        for (feed in this.groups[this.current_group].feeds) {
                            if (this.groups[this.current_group].feeds.hasOwnProperty(feed)) {
                                mark.push('<read><md5>' + feed + '</md5></read>');
                            }
                        }
                    }
                } else {
                    mark.push('<read><md5>' + this.current_feed + '</md5></read>');
                }
                for (i = 0; i < mark.length; i++) {
                    $.ajax({
                        url: this.url,
                        type: 'GET',
                        data: {
                            'method': 'PUT',
                            'url': '/subscriptions',
                            'token': this.token,
                            'data': mark[i]
                        },
                        async: true
                    });
                }
            }
            status = '';
        } else {
            mark = '<post id="' + this.posts[this.current_post].id + '"><' + status + '/></post>';
            $.ajax({
                url: this.url,
                type: 'GET',
                data: {
                    'method': 'PUT',
                    'url': this.posts[this.current_post].meta,
                    'token': this.token,
                    'data': mark
                },
                async: true
            });
        }
        if (!this.worker_init) {
            this.worker.window.postMessage({'message': 'config', 'token': app.token, 'url': app.url}, '*');
            this.worker_init = true;
        }
        this.worker.window.postMessage({'message': 'sendPostsStatus', 'data': this.posts_queue}, '*');
        this.posts_queue = [];
        switch (status) {
            case 'read': {
                if ($(this.posts[this.current_post].post).hasClass('post')) {
                    $(this.posts[this.current_post].post).html(this.getPostTitle(this.current_post) + app.getPostContent(-1))
                        .removeClass('post')
                        .addClass('expost')
                        .on('click', function () {
                            var $this = $(this),
                                id = $this.attr('id');
                            $this.html(app.getPostTitle(id) + app.getPostContent(id));
                        })
                        .on('mouseleave', function () {
                            var $this = $(this);
                            if ($this.children('#content').length !== 0) {
                                $this.html(app.getPostTitle($this.attr('id')) + app.getPostContent(-1));
                                app.setCurrentPost(app.current_post, false, false);
                            }
                        });
                }
                break;
            }
            case 'archive':
            case 'favorite':
            case 'hidden':
            default: {;
            }
        }
    },

    showGroups: function () {
        var $ul = $('#ul'),
            app = this,
            sub_ul,
            div1,
            div,
            j,
            i;
        $ul.empty();
        function callbackForGetPosts() {
            app.showPosts();
            app.setCurrentPost(0, false, true);
        }
        function processFeedClick() {
            app.all_group = true;
            app.setCurrentFeed('');
            app.setCurrentGroup($(this).parent().attr('id'));
            app.getPosts(true, true, '', callbackForGetPosts);
        }
        function processGroupClick() {
            var c_g = app.current_group,
                a_g = app.all_group;
            app.all_group = true;
            app.current_group = $(this).parent().attr('id');
            app.setPostStatus('read', true, false);
            app.updateUnreadCount(app.groups[app.current_group].unread_count, '');
            app.all_group = a_g;
            app.current_group = c_g;
        }
        function processGroupClick1() {
            var c_f = app.current_feed,
                a_g = app.all_group,
                c_g = app.current_group;
            app.all_group = false;
            app.current_group = $(this).parent().parent().parent().attr('id');
            app.current_feed = $(this).parent().attr('id');
            app.setPostStatus('read', true, false);
            app.updateUnreadCount(app.groups[app.current_group].feeds[app.current_feed].unread_count, app.current_feed);
            app.all_group = a_g;
            app.current_feed = c_f;
            app.current_group = c_g;
        }
        function processFeedClick1() {
            app.all_group = false;
            app.setCurrentGroup('');
            app.setCurrentFeed($(this).parent().attr('id'));
            app.current_group = $(this).parent().parent().parent().attr('id');
            app.getPosts(true, false, '', callbackForGetPosts);
        }
        for (i in this.groups) {
            if (this.groups.hasOwnProperty(i) && (this.groups[i].unread_count > 0)) {
                this.groups[i].li = document.createElement('li');
                div = document.createElement('div');
                div1 = document.createElement('div');
                $(div).attr('id', 'top_tit')
                       .text(this.groups[i].name)
                       .on('click', processFeedClick);
                $(div1).attr('id', 'count')
                    .text(this.groups[i].unread_count)
                    .on('click', processGroupClick);
                $(this.groups[i].li).attr('id', i)
                    .addClass('top_li')
                    .append(div)
                    .append(div1);
                sub_ul = document.createElement('ul');
                for (j in this.groups[i].feeds) {
                    if (this.groups[i].feeds.hasOwnProperty(j)) {
                        if (this.groups[i].feeds[j].unread_count > 0) {
                            this.groups[i].feeds[j].li = document.createElement('li');
                            div = document.createElement('div');
                            $(div).attr('id', 'sub_tit')
                                  .text(this.groups[i].feeds[j].title)
                                  .on('click', processFeedClick1);
                            div1 = document.createElement('div');
                            $(div1).attr('id', 'count')
                                   .text(this.groups[i].feeds[j].unread_count)
                                   .on('click', processGroupClick1);
                            $(this.groups[i].feeds[j].li).attr('id', j)
                                .addClass('sub_li')
                                .append(div)
                                .append(div1);
                            $(sub_ul).append(this.groups[i].feeds[j].li);
                        }
                    }
                }
                $(this.groups[i].li).append(sub_ul);
                $ul.append(this.groups[i].li);
                //last_group = i;
            }
        }
        this.setCurrentFeed(this.current_feed);
    },
    getPostTitle: function (i) {
        var s = '<h3><a href="' + this.posts[i].link + '" target="_blank">' + this.posts[i].title + '</a></h3>' +
                '<div id="feed_d">' + this.groups[this.current_group].feeds[this.posts[i].feed].title + ' | ' + this.posts[i].author + ' | ' + this.posts[i].date + '</div>';
        return s;
    },
    getPostContent: function (i) {
        var result;
        if (i === -1) {
            result = '<p id="content" class="empty"></p>';
        } else {
            result = '<p id="content">' + this.posts[i].content + '</p>';
        }
        return result;
    },
    showPosts: function () {
        var l = this.posts.length,
            pdiv,
            i;
        $('#right').empty();
        this.current_post = 0;
        function setCurrentPost() {
            app.setCurrentPost(Number($(this).attr('id')), false, true);
        }
        for (i = 0; i < l; i++) {
            if (!this.posts[i].read) {
                pdiv = document.createElement('div');
                switch (this.view_type) {
                    case 'title_type': {
                        $(pdiv).html(this.getPostTitle(i) + this.getPostContent(-1));
                        break;
                    }
                    case 'full_type': {
                        $(pdiv).html(this.getPostTitle(i) + this.getPostContent(i));
                        break;
                    }
                    default: {;
                    }
                }
                $(pdiv).attr('id', i)
                    .addClass('post')
                    .on('click', setCurrentPost);
                $('#right').append(pdiv);
                this.posts[i].post = pdiv;
            }
        }
        this.setScroll(0, true);
    },
    setCurrentFeed: function (next_feed) {
        var $current_feed = $('#' + this.current_feed),
            $next_feed;
        $current_feed.removeClass('sub_li_sel');
        $current_feed.addClass('sub_li');
        if (next_feed !== '') {
            $next_feed = $('#' + next_feed);
            $next_feed.removeClass('sub_li');
            $next_feed.addClass('sub_li_sel');
            this.current_feed = next_feed;
        }
    },
    setCurrentGroup: function (next_group) {
        var $current_group = $('#' + this.current_group),
            $next_group;
        $current_group.removeClass('top_li_sel');
        $current_group.addClass('top_li');
        if (next_group !== '') {
            $next_group = $('#' + next_group);
            $next_group.removeClass('top_li');
            $next_group.addClass('top_li_sel');
            this.current_group = next_group;
        }
    },
    setCurrentPost: function (id, scan, up) {
        var $current_post,
            id_n;
        $current_post = $('#' + this.current_post);
        $current_post.children('h3').css('background-color', this.colors.p);
        if (scan) {
            id_n = 0;
            if (up) {
                id_n = Number($current_post.prevAll('.post').attr('id'));
                if (isNaN(id_n)) {
                    id_n = Number($current_post.nextAll('.post').attr('id'));
                }
            } else {
                id_n = Number($current_post.nextAll('.post').attr('id'));
                if (isNaN(id_n)) {
                    id_n = Number($current_post.prevAll('.post').attr('id'));
                }
            }
            if (!isNaN(id_n)) {
                this.current_post = id_n;
            }
        } else {
            if (this.posts[id].hasOwnProperty('post') && $(this.posts[id].post).hasClass('post')) {
                this.current_post = id;
            }
        }
        $('#' + this.current_post).children('h3').css('background-color', this.colors.a);
        return this.current_post;
    },
    setCurrentViewType: function (next_type) {
        $('#' + this.view_type).css('background-color', this.colors.p);
        $('#' + next_type).css('background-color', this.colors.a);
        this.view_type = next_type;
    },
    setScroll: function (curp, up) {
        var $curp = $('#' + curp),
            v,
            t;
        if ($curp.length > 0) {
            if (curp >= 0) {
                if (up) {
                    v = $curp.css('margin-top');
                    t = $curp.offset().top - parseInt(v.substr(0, v.length - 2), 10);
                } else {
                    t = $curp.offset().top + $curp.height();
                }
            } else {
                t = 0;
            }
        }
        window.scrollTo(0, t);
    },
    updateUnreadCount: function (cnt, fd) {
        app.groups[app.current_group].unread_count -= cnt;
        if (app.groups[app.current_group].unread_count === 0) {
            $(app.groups[app.current_group].li).hide('slow');
        } else {
            if (fd === '') {
                fd = app.posts[app.current_post].feed;
            }
            $(app.groups[app.current_group].li).children('#count').eq(0).text(app.groups[app.current_group].unread_count);
            app.groups[app.current_group].feeds[fd].unread_count -= cnt;
            if (app.groups[app.current_group].feeds[fd].unread_count === 0) {
                $(app.groups[app.current_group].feeds[fd].li).hide('slow');
            } else {
                $(app.groups[app.current_group].feeds[fd].li).children('#count').text(app.groups[app.current_group].feeds[fd].unread_count);
            }
        }
    }
};

$(document).ajaxStart(function () {
    $('#loading').show();
});
$(document).ajaxStop(function () {
    $('#loading').hide();
});
$(document).keypress(function (e) {
    switch (e.which) {
        case 1090:
        case 110: {//n
            app.setScroll(app.setCurrentPost(-1, true, false) - 1, false);
            break;
        }
        case 1080:
        case 98: {//b
            app.setScroll(app.setCurrentPost(-1, true, true), true);
            break;
        }
        case 1095:
        case 120: {//x
            if (!app.posts[app.current_post].read) {
                app.posts[app.current_post].read = true;
                app.updateUnreadCount(1, '');
                app.setPostStatus('read', false);
            }
            app.setCurrentPost(-1, true, false);
            break;
        }
        case 1063:
        case 88: {//shift+x
            if (app.all_group) {
                app.updateUnreadCount(app.groups[app.current_group].unread_count, '');
            } else {
                app.updateUnreadCount(app.groups[app.current_group].feeds[app.posts[app.current_post].feed].unread_count, '');
            }
            $('#right').children('.post').each(function () {
                $(this).children('h3').children('a').css('color', app.colors.r);
            });
            app.setPostStatus('read', true, false);
            break;
        }
        case 1086:
        case 106: {//j
            if (!app.posts[app.current_post].read) {
                app.posts[app.current_post].read = true;
                app.updateUnreadCount(1, '');
                app.setPostStatus('read', false);
            }
            app.setScroll(app.setCurrentPost(-1, true, false) - 1, false);
            break;
        }
        case 1083:
        case 107: {//k
            if (!app.posts[app.current_post].read) {
                app.posts[app.current_post].read = true;
                app.updateUnreadCount(1, '');
                app.setPostStatus('read', false);
            }
            app.setScroll(app.setCurrentPost(-1, true, true), true);
            break;
        }
        case 1060:
        case 65: {//shift+a
            if (app.all_group) {
                app.updateUnreadCount(app.groups[app.current_group].unread_count, '');
            } else {
                app.updateUnreadCount(app.groups[app.current_group].feeds[app.posts[app.current_post].feed].unread_count, '');
            }
            $('#right').children('.post').each(function () {
                $(this).children('h3').children('a').css('color', app.colors.r);
            });
            app.setPostStatus('read', true, true);
            break;
        }
        case 1082:
        case 114: {//r
            if (app.all_group) {
                $(app.groups[app.current_group].li).children('#top_tit').click();
            } else {
                $('#' + app.current_feed).children('#sub_tit').click();
            }
            break;
        }
        case 1050:
        case 82: {//shift+r
            app.getGroups(true);
            break;
        }
        case 1088:
        case 104: {//h
            if ($('#help').css('display') === 'none') {
                $('#help').show();
            } else {
                $('#help').hide();
            }
            break;
        }
        case 1084:
        case 118: {//v
            if ($('#view_type').css('display') === 'none') {
                $('#view_type').show();
            } else {
                $('#view_type').hide();
            }
            break;
        }
        case 27://esc
        case 0: {
            $('#help').hide();
            $('#view_type').hide();
            break;
        }
        case 1099:
        case 115: {//s
            if ($('#' + app.current_post).hasClass('post')) {
                if ($('#' + app.current_post).children('#content').hasClass('empty')) {
                    $('#' + app.current_post).html(app.getPostTitle(app.current_post) + app.getPostContent(app.current_post));
                } else {
                    $('#' + app.current_post).html(app.getPostTitle(app.current_post) + app.getPostContent(-1));
                }
            }
            app.setScroll(app.setCurrentPost(app.current_post, false, false) - 1, false);
            break;
        }
        default: {;//alert(e.which);
        }
    }
});


$(document).ready(function () {
    if (app.start()) {
        $('#title_type').on('click', function () {
            app.setCurrentViewType($(this).attr('id')); $('#view_type').hide();
        });
        $('#full_type').on('click', function () {
            app.setCurrentViewType($(this).attr('id')); $('#view_type').hide();
        });
        app.setCurrentViewType('title_type');
        app.getGroups(true);
        app.worker = window.frames.worker;
    } else {
        alert('No access to Yandex');
    }
});
