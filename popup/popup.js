// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const ORIGIN_REG = /^http[s]?:\/\/([^\/]+)+(:[0-9]+)?/;
const STORAGE_NAME_SPACE = 'mask_map';
let isError = false;

let $maskInput = document.querySelector('.mask_input');
let $currentError = document.querySelector('.current_error');
let $clearBtn = document.querySelector('#clear_btn');
let $confirmBtn = document.querySelector('#confirm_btn');
let activeTab;
let tabOriginValue = '';
let maskOriginValue = '';
let maskMap = {};

// 获取active tab 和此tab域名对应的maskOrigin
chrome.tabs.query({
    currentWindow: true,
    active: true,
},function(tabs){
    activeTab = tabs[0];

    const match = activeTab.url.match(ORIGIN_REG);
    if (match) {
        tabOriginValue = match[0];
        chrome.storage.local.get(STORAGE_NAME_SPACE, function(result) {
            maskMap = result[STORAGE_NAME_SPACE] || {};
            console.log('maskMap: ', maskMap);
            console.log(tabOriginValue +' \'s current mask is ' + maskMap[tabOriginValue]);
            maskOriginValue = maskMap[tabOriginValue] || '';
            initView();
        });
    }

})
// 初始化页面交互
function initView() {
    $maskInput.value = maskOriginValue;
    judgeLegal(maskOriginValue);

    $maskInput.addEventListener('input', function(e){
        maskOriginValue = e.target.value;
        judgeLegal();
    })
    $confirmBtn.addEventListener('click', function(){
        if (!isError) {
            maskMap[tabOriginValue] = maskOriginValue;
            chrome.storage.local.set({[STORAGE_NAME_SPACE]: maskMap}, function() {
                console.log(tabOriginValue +' \'s mask is set to ' + maskOriginValue);
            });
            chrome.tabs.reload(activeTab.id, {
                bypassCache: true
            });
            window.close();
        }
    })
    $clearBtn.addEventListener('click', function(){
        delete maskMap[tabOriginValue];
        chrome.storage.local.set({[STORAGE_NAME_SPACE]: maskMap}, function() {
            console.log(tabOriginValue +' \'s mask is clear');
        });
        chrome.tabs.reload(activeTab.id, {
            bypassCache: true
        });
        window.close();
    })
    
    function judgeLegal(){
        isError = !ORIGIN_REG.exec(maskOriginValue);
        toggleError(isError);
        toggleConfirmDisabled(isError);
    }
    function toggleError(toShow) {
        $currentError.style.display = toShow ? 'block' : 'none';
    }
    function toggleConfirmDisabled(isDisabled) {
        if (isDisabled) {
            $confirmBtn.classList.add('disabled');
        } else {
            $confirmBtn.classList.remove('disabled');
        }
    }
}
