// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const ORIGIN_REG = /^http[s]?:\/\/([^\/]+)+(:[0-9]+)?/;
const STORAGE_NAME_SPACE = 'mask_map';
let maskMap = {};

// 插件初始化 监听页面变化
chrome.runtime.onInstalled.addListener(function() {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [
        new chrome.declarativeContent.PageStateMatcher({
          // pageUrl: {hostEquals: 'developer.chrome.com'},
        })
      ],
      actions: [new chrome.declarativeContent.ShowPageAction()]
    }]);
  });
});
// 首次获取maskMap置于内存中
chrome.storage.local.get(STORAGE_NAME_SPACE, function(result) {
  maskMap = result[STORAGE_NAME_SPACE] || {};
  console.log('maskMap: ', maskMap);
});
// storage中maskMap变化时 更新变量
chrome.storage.onChanged.addListener(function(changes, namespace) { // namespace = 'local' | 'sync'
  for (var key in changes) {
    var storageChange = changes[key];
    console.log('Storage key "%s" in namespace "%s" changed. ' +
                'Old value was "%s", new value is "%s".',
                key,
                namespace,
                storageChange.oldValue,
                storageChange.newValue);
    console.log(storageChange.oldValue, storageChange.newValue);
    if (key === STORAGE_NAME_SPACE) {
      maskMap = storageChange.newValue;
    }
  }
});
// 发送requestHeaders前修改Origin、Referer
chrome.webRequest.onBeforeSendHeaders.addListener(function(details){
  const originValue = getTargetOriginInMaskMap(details.initiator);
  if (originValue) {
    details.requestHeaders.forEach(function(item){
      if (item.name.toLowerCase() === 'origin') {
        item.value = originValue;
      }
      if (item.name.toLowerCase() === 'referer') {
        const match = details.initiator.match(ORIGIN_REG);
        const origin = match ? match[0] : '';
        item.value = details.initiator.replace(origin, originValue);
      }
    })
  }
  return {
    requestHeaders: details.requestHeaders
  };
}, {
  urls: ["<all_urls>"]
},
  ["blocking", "requestHeaders", "extraHeaders"]
);
// 接受responseHeaders后修改Access-Control-Allow-Origin
chrome.webRequest.onHeadersReceived.addListener(function(details){
  const originValue = getSrcOriginInMaskmap(details.initiator);
  if (originValue) {
    let flag = false;
    details.responseHeaders.forEach(function(item){
      if (item.name.toLowerCase() === 'access-control-allow-origin') {
        item.value = originValue;
        flag = true;
      }
    })
    if (!flag) {
      details.responseHeaders.push({
        name: 'Access-Control-Allow-Origin',
        value: originValue
      })
      details.responseHeaders.push({
        name: 'Access-Control-Allow-Credentials',
        value: 'true'
      })
    }

    details.responseHeaders.push({
      name: 'Access-Control-Allow-Headers',
      value: 'Accept, Accept-Language, Content-Language, Content-Type'
    })
  }
  return {
    responseHeaders: details.responseHeaders
  };
}, {
  urls: ["<all_urls>"]
},
  ["blocking", "responseHeaders", "extraHeaders"]
);


function getSrcOriginInMaskmap(initiator){
  // 'initiator' is not exists when getting html
  if (!initiator) {
    return;
  }
  const match = initiator.match(ORIGIN_REG);
  const tabOriginValue = match ? match[0] : '';
  return maskMap[tabOriginValue] ? tabOriginValue : '';
}
function getTargetOriginInMaskMap(initiator){
  // 'initiator' is not exists when getting html
  if (!initiator) {
    return;
  }
  const match = initiator.match(ORIGIN_REG);
  const tabOriginValue = match ? match[0] : '';
  const maskOriginValue = maskMap[tabOriginValue] || '';
  return maskOriginValue;
}