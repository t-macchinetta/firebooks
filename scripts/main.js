/*!
 *
 *  Web Starter Kit
 *  Copyright 2015 Google Inc. All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License
 *
 */
/* eslint-env browser */
$(function () {
  'use strict';

  // Check to make sure service workers are supported in the current browser,
  // and that the current page is accessed from a secure origin. Using a
  // service worker from an insecure origin will trigger JS console errors. See
  // http://www.chromium.org/Home/chromium-security/prefer-secure-origins-for-powerful-new-features
  var isLocalhost = Boolean(window.location.hostname === 'localhost' ||
    // [::1] is the IPv6 localhost address.
    window.location.hostname === '[::1]' ||
    // 127.0.0.1/8 is considered localhost for IPv4.
    window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    )
  );

  if ('serviceWorker' in navigator &&
    (window.location.protocol === 'https:' || isLocalhost)) {
    navigator.serviceWorker.register('service-worker.js')
      .then(function (registration) {
        // updatefound is fired if service-worker.js changes.
        registration.onupdatefound = function () {
          // updatefound is also fired the very first time the SW is installed,
          // and there's no need to prompt for a reload at that point.
          // So check here to see if the page is already controlled,
          // i.e. whether there's an existing service worker.
          if (navigator.serviceWorker.controller) {
            // The updatefound event implies that registration.installing is set:
            // https://slightlyoff.github.io/ServiceWorker/spec/service_worker/index.html#service-worker-container-updatefound-event
            var installingWorker = registration.installing;

            installingWorker.onstatechange = function () {
              switch (installingWorker.state) {
                case 'installed':
                  // At this point, the old content will have been purged and the
                  // fresh content will have been added to the cache.
                  // It's the perfect time to display a "New content is
                  // available; please refresh." message in the page's interface.
                  break;

                case 'redundant':
                  throw new Error('The installing ' +
                    'service worker became redundant.');

                default:
                // Ignore
              }
            };
          }
        };
      }).catch(function (e) {
        console.error('Error during service worker registration:', e);
      });
  }

  // Your custom JavaScript goes here
  // Initialize Firebase
  var config = {
    apiKey: "AIzaSyDkAPCW_qeNb6NnRKLnUwvEBkfSsGV-7mA",
    authDomain: "firebooks-c83e4.firebaseapp.com",
    databaseURL: "https://firebooks-c83e4.firebaseio.com",
    projectId: "firebooks-c83e4",
    storageBucket: "firebooks-c83e4.appspot.com",
    messagingSenderId: "79484055887"
  };
  firebase.initializeApp(config);

  //リアルタイム通信の準備
  var newPostRef = firebase.database().ref();
  // ログイン用
  var userEmail = "";
  var userName = "";

  // googleログイン
  firebase.auth().getRedirectResult().then(function (result) {
    if (!result.credential) {
      //ログインしていなければ認証画面にリダイレクト
      var provider = new firebase.auth.GoogleAuthProvider();
      firebase.auth().signInWithRedirect(provider);
      // firebase.auth().signInWithPopup(provider);
      return;
    }
    //ログイン成功時の処理
    $('#userIcon').html('<img id="logout" src="' + result.user.photoURL + 'width="30" height="30" class="d-inline-block align-top" alt="' + result.user.displayName + '">');
    $('#loading_start').fadeOut(100);
    $('#loading_end').fadeIn(100);
    // ユーザー情報の取得
    userEmail = result.user.email;
    userName = result.user.displayName;
    // ログインしたユーザーの情報だけ表示するようにする
    var query = newPostRef.orderByChild('user_id').equalTo(userEmail);
    // 追加時と編集時にリアルタイムで変更する
    query.on('value', function (snapshot) {
      var str = "";
      snapshot.forEach(function (child) {
        // ↓ユニークキー取得
        var k = child.key;
        // ↓データ取得
        var v = child.val();
        // メッセージ表示
        str = str +
          `<div class="card mb-3" id="${k}">
              <div class="card-header">
                  <h5 class="card-title title keyword">${v.title}</h5>
                  <div class="card-subtitle mb-2 text-muted rate">${v.rate}</div>
              </div>
              <div class="card-block hidden">
                  <div class="card-text">updated at <span class="date">${v.date}</span></div>
                  <div class="card-text">by <span class="username">${v.username}</span></div>
                  <div class="card-text comment keyword">${v.comment}</div>
                  <button type="button" class="btn btn-secondary mt-2 mr-2 edit disable"><i class="material-icons">edit</i></button>
                  <button type="button" class="btn btn-secondary mt-2 delete disable"><i class="material-icons">delete</i></button>
              </div>
          </div>`;
      });
      // ↓表示処理
      // 情報が変更されるたびに更新するのでhtmlにする
      $('#output').html(str);
      // タイトル順で並ぶように
      var $arr = $('.card').sort(function (a, b) {
        return ($(a).find('.title').text() > $(b).find('.title').text() ? 1 : -1);  //ソート条件
      });
      // 変更した並び順で表示
      $('#output').html($arr);
    });
  }).catch(function (error) {
    // ログイン失敗したとき
    console.log('Error', error);
    $('#username').html("Login Error.")
  });

  // googleログアウト
  $('#userIcon').on('click', '#logout', function () {
    if (!confirm('You are logged in ' + userName + '\nAre you sure you want to log out?')) {
      return false;
    } else {
      firebase.auth().signOut().then(function () {
        $('#loading_end').fadeOut(100);
        location.reload();
      }, function (error) {
      });
    }
  });


  // 以下，データ登録・表示関連

  // 編集判別要変数
  var editStatus = 0;

  // データ追加時の処理
  // submitでデータ送信
  $('#send').on('click', function () {
    var time = new Date();
    var year = time.getFullYear();
    var month = time.getMonth() + 1;
    var date = time.getDate();
    // var nowdate = year + "/" + month + "/" + date;
    var nowdate = `${year}/${month}/${date}`;
    newPostRef.push({
      date: nowdate,
      user_id: userEmail,
      username: userName,
      title: $('#title').val(),
      rate: $('#rate').val(),
      comment: $('#text').val().split('\n').join('<br>')
    });
    $('#title').val("");
    $('#rate').val("★★★");
    $('#text').val("");
    // 送信ボタン無効化
    $('#send').prop('disabled', true);
    // モーダル閉じる
    $('body').removeClass('modal-open');
    $('.modal-backdrop').remove();
    $('#input').modal('hide');
  });
  // タイトル未入力時はsendボタン無効化
  $('#title').on('keyup', function () {
    if ($('#title').val() == "") {
      $('#send').prop('disabled', true);
    } else {
      $('#send').prop('disabled', false);
    }
  });
  // 編集時も同様
  $('#output').on('keyup', '#title_edit', function () {
    if ($('#title_edit').val() == "") {
      $('.set').prop('disabled', true);
    } else {
      $('.set').prop('disabled', false);
    }
  });

  // 編集ボタンの挙動
  $('#output').on('click', '.edit', function () {
    editStatus = 1;
    var id = $(this).parent().parent().attr("id");
    var username = $('#' + id).find('.username').text();
    var date = $('#' + id).find('.date').text();
    var title = $('#' + id).find('.title').text();
    var rate = $('#' + id).find('.rate').text();
    var comment = $('#' + id).find('.comment').html();
    var editComment = comment.split('<br>').join('\n');
    var rate_select;
    // 項目を編集できるようにinputに変更する
    // 評価の数値で表示を分ける
    if (rate == "★★★★★") {
      rate_select = `<select id="rate_edit" class="form-control"><option value="★★★★★" selected>★★★★★</option><option value="★★★★">★★★★</option><option value="★★★">★★★</option><option value="★★">★★</option><option value="★">★</option></select>`;
    } else if (rate == "★★★★") {
      rate_select = `<select id="rate_edit" class="form-control"><option value="★★★★★">★★★★★</option><option value="★★★★" selected>★★★★</option><option value="★★★">★★★</option><option value="★★">★★</option><option value="★">★</option></select>`;
    } else if (rate == "★★★") {
      rate_select = `<select id="rate_edit" class="form-control"><option value="★★★★★">★★★★★</option><option value="★★★★">★★★★</option><option value="★★★" selected>★★★</option><option value="★★">★★</option><option value="★">★</option></select>`;
    } else if (rate == "★★") {
      rate_select = `<select id="rate_edit" class="form-control"><option value="★★★★★">★★★★★</option><option value="★★★★">★★★★</option><option value="★★★">★★★</option><option value="★★" selected>★★</option><option value="★">★</option></select>`;
    } else if (rate == "★") {
      rate_select = `<select id="rate_edit" class="form-control"><option value="★★★★★">★★★★★</option><option value="★★★★">★★★★</option><option value="★★★">★★★</option><option value="★★">★★</option><option value="★" selected>★</option></select>`;
    }

    var str =
      `<div class="card-header">
          <h5 class="card-title title keyword">
              <input type="text" id="title_edit" class="form-control" value="${title}"/>
          </h5>
          <div class="card-subtitle mb-2 text-muted rate">${rate_select}</div>
      </div>
      <div class="card-block">
          <div class="card-text">updated at <span class="date">${date}</span></div>
          <div class="card-text">by <span class="username">${username}</span></div>
          <div class="card-text comment keyword">
              <textarea rows="3" id="text_edit" class="form-control">${editComment}</textarea>
          </div>
          <button type="button" class="btn btn-secondary mt-2 mr-2 cancel disable"><i class="material-icons">arrow_back</i></button>
          <button type="button" class="btn btn-primary mt-2 set disable"><i class="material-icons">done</i></button>
      </div>`;
    $('#' + id).html(str);

    // 変更していない部分のボタンは押せないようにする
    $('nav button').prop('disabled', true);
    $('.edit, .delete, #add, #send, #search-text').prop('disabled', true);
    // $('.delete').prop('disabled', true);
    // $('#add').prop('disabled', true);
    // $('#send').prop('disabled', true);
    // $('#search-text').prop('disabled', true);
    $('input[name="search"]:radio').prop('disabled', true);
    // キャンセル時の挙動
    // inputを登録内容の表示に戻す
    $('#output').on('click', '.cancel', function () {
      // $('#' + id).find('.title').html(title);
      // $('#' + id).find('.rate').html(rate);
      // $('#' + id).find('.comment').html(comment);
      // $('#' + id).find('.cancel').html(`<i class="material-icons">edit</i>`);
      // $('#' + id).find('.cancel').addClass('edit');
      // $('#' + id).find('.cancel').removeClass('cancel');
      // $('.edit').prop('disabled', false);
      // $('#' + id).find('.set').html(`<i class="material-icons">delete</i>`);
      // $('#' + id).find('.set').addClass('delete');
      // $('#' + id).find('.set').removeClass('set');
      // $('#' + id).find('.delete').addClass('btn-secondary');
      // $('#' + id).find('.delete').removeClass('btn-primary');
      // $('.delete').prop('disabled', false);
      // $('#add').prop('disabled', false);
      // // $('#send').prop('disabled', false);
      // $('#search-text').prop('disabled', false);
      // $('input[name="search"]:radio').prop('disabled', false);
      var str =
        `<div class="card-header">
                  <h5 class="card-title title keyword">${title}</h5>
                  <div class="card-subtitle mb-2 text-muted rate">${rate}</div>
              </div>
              <div class="card-block">
                  <div class="card-text">updated at <span class="date">${date}</span></div>
                  <div class="card-text">by <span class="username">${username}</span></div>
                  <div class="card-text comment keyword">${comment}</div>
                  <button type="button" class="btn btn-secondary mt-2 mr-2 edit disable"><i class="material-icons">edit</i></button>
                  <button type="button" class="btn btn-secondary mt-2 delete disable"><i class="material-icons">delete</i></button>
              </div>`;
      $('#' + id).html(str);
      $('nav button').prop('disabled', false);
      $('.edit, .delete, #add, #send, #search-text').prop('disabled', false);
      $('input[name="search"]:radio').prop('disabled', false);
      editStatus = 0;
    });
    // 決定時の挙動
    $('#output').on('click', '.set', function () {
      // 対応するデータを更新する
      // 入力内容を取得
      var id = $(this).parent().parent().attr("id");
      // var username = $('#username_edit').val();
      var title = $('#title_edit').val();
      var rate = $('#rate_edit').val();
      var comment = $('#text_edit').val().split('\n').join('<br>');
      // 日付
      var time = new Date();
      var year = time.getFullYear();
      var month = time.getMonth() + 1;
      var date = time.getDate();
      // var nowdate = year + "/" + month + "/" + date;
      var nowdate = `${year}/${month}/${date}`;
      // 更新する場所を指定
      var bookRef = firebase.database().ref("/" + id);
      // 現在のユニークキー箇所を更新するバージョン
      bookRef.update({
        date: nowdate,
        title: title,
        rate: rate,
        comment: comment
      });
      // input関連を戻す
      $('#' + id).find('.title').html(title);
      $('#' + id).find('.rate').html(rate);
      $('#' + id).find('.comment').html(comment);
      $('#' + id).find('.cancel').html(`<i class="material-icons">edit</i>`);
      $('#' + id).find('.cancel').addClass('edit');
      $('#' + id).find('.cancel').removeClass('cancel');
      $('.edit').prop('disabled', false);
      $('#' + id).find('.set').html(`<i class="material-icons">delete</i>`);
      $('#' + id).find('.set').addClass('delete');
      $('#' + id).find('.set').removeClass('set');
      $('#' + id).find('.delete').addClass('btn-secondary');
      $('#' + id).find('.delete').removeClass('btn-primary');
      $('.delete').prop('disabled', false);
      $('#add').prop('disabled', false);
      $('#search-text').prop('disabled', false);
      $('input[name="search"]:radio').prop('disabled', false);
      editStatus = 0;
    });
  });


  // 削除ボタンの挙動
  $('#output').on('click', '.delete', function () {
    if (!confirm('本当に削除しますか?')) {
      return false;
    } else {
      // 削除時の挙動
      // id(ユニークキー)を取得
      var id = $(this).parent().parent().attr("id");
      newPostRef.child(id).remove();
      editStatus = 0;
    }
  });

  // 検索用の関数
  var searchTitle = function () {
    var searchText = $('#search-text').val(), // 検索ボックスに入力された値
      targetText;
    // 全角スペースを半角スペースに置換
    searchText = searchText.replace(/　/gi, ' ');
    // 半角配列に入れるで区切って配列化
    var searchArr = searchText.split(" ");
    if ($("[name=search]:checked").val() == "title") {
      $('.title').each(function () {
        targetText = $(this).text();
        // 検索対象となるリストに入力された文字列が存在するかどうかを判断
        if (targetText.indexOf(searchText) != -1) {
          $(this).parent().parent().removeClass('hidden');
        } else {
          $(this).parent().parent().addClass('hidden');
        }
      });
    } else {
      $('.comment').each(function () {
        targetText = $(this).text();
        // 検索対象となるリストに入力された文字列が存在するかどうかを判断
        if (targetText.indexOf(searchText) != -1) {
          $(this).parent().parent().removeClass('hidden');
        } else {
          $(this).parent().parent().addClass('hidden');
        }
      });
    }
  };
  // 入力かラジオボタン操作で検索
  $('#search-text').on('keyup', searchTitle);
  $('input[name="search"]:radio').on('click', searchTitle);
  // 編集とかしたときに検索した状態を保存したい
  $('#output').on('click', '.set', searchTitle);

  // タイトルクリックで詳細表示
  $('#output').on('click', '.card-header', function () {
    if (editStatus == 0) {
      var id = $(this).parent().attr("id");
      $('#' + id).find('.card-block').slideToggle();
    }
  });

  // textareaの自動リサイズ
  $('textarea').each(function () {
    $(this).css({
      'overflow': 'hidden',
      'resize': 'none'
    })
      .data('original_row', $(this).attr('rows'));
  });

  $('textarea').bind('keyup', function () {
    var self = this;
    var value = $(this).val().split("\n");
    var value_row = 0;
    $.each(value, function (i, val) {
      value_row += Math.max(Math.ceil(val.length / self.cols), 1);
    });
    var input_row = $(this).attr('rows');
    var original_row = $(this).data('original_row');
    var next_row = (input_row <= value_row) ? value_row + 1 : Math.max(value_row + 1, original_row);
    $(this).attr('rows', next_row);
  });



});
