<?php

$token = $_GET['token'];
$url = $_GET['url'];
$method = $_GET['method'];
$data = $_GET['data'];
if ($url[0] == '/') {
    $crl = curl_init('http://api-lenta.yandex.ru'.$url);
}
else {
    $crl = curl_init($url);
}
switch ($method) {
    case 'GET' : {
        $header = array('AUTHORIZATION: OAuth '.$token);
        break;
    }
    case 'POST' :
    case 'PUT' : {
        $header = array('AUTHORIZATION: OAuth '.$token, 'Content-Type: application/x-yandex-lenta+xml; type=read');
        curl_setopt($crl, CURLOPT_POSTFIELDS, $data);
        break;
    }
}
curl_setopt($crl, CURLOPT_SSL_VERIFYPEER, 0);
curl_setopt($crl, CURLOPT_HTTPHEADER, $header);
curl_setopt($crl, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($crl, CURLOPT_RETURNTRANSFER, 1);
$result['data'] = curl_exec($crl);
$result['reason'] = curl_error($crl);
$result['status'] = curl_getinfo($crl, CURLINFO_HTTP_CODE);
echo json_encode($result);
curl_close($crl);
?>