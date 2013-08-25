var worker = {
token : '',
queue : [],
url : '',
sendPostStatus : function() {
    var el = worker.queue.pop();
    if (el) { 
        $.ajax({ url : worker.url, type : 'GET', data: {'method' : 'PUT', 'url' : el['url'], 'token' : worker.token, 'data' : el['mark']}, async : true, dataType : 'json', success: function() {worker.sendPostStatus();} });
        el = worker.queue.pop();
        if (el) { 
            $.ajax({ url : worker.url, type : 'GET', data: {'method' : 'PUT', 'url' : el['url'], 'token' : worker.token, 'data' : el['mark']}, async : true, dataType : 'json', success: function() {worker.sendPostStatus();} });
        }
    }
}
}

$(document).ajaxStart(function() { $('#loading').show(); });
$(document).ajaxStop(function() { $('#loading').hide(); });

$(document).ready(function() {
    $(window).on('message', function(e) {
        switch (e.originalEvent.data['message']) {
            case 'config': 
                worker.token = e.originalEvent.data['token'];
                worker.url = e.originalEvent.data['url'];
            break;
            case 'sendPostsStatus':
                worker.queue = worker.queue.concat(e.originalEvent.data['data']);
                worker.sendPostStatus();
            break;
            default: {
                alert('Unknown message');
            }
        }
    });
})