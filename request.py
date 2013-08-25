#!/usr/bin/python

import cgi, cgitb, httplib, json
cgitb.enable()

print ''
q = cgi.FieldStorage()

connect = httplib.HTTPConnection('api-lenta.yandex.ru')
if q['method'].value == 'PUT':
    header = {'AUTHORIZATION': 'OAuth ' + q['token'].value, 'Content-Type': 'application/x-yandex-lenta+xml; type=read'}
else:
    header = {'AUTHORIZATION': 'OAuth ' + q['token'].value}
connect.request(q['method'].value, q['url'].value, q['data'].value, header)
resp = connect.getresponse()
result = {}
result['data'] = resp.read()
result['status'] = resp.status
result['reason'] = resp.reason
print json.dumps(result)
connect.close()
