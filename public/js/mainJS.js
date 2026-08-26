function navAction() {
    // Scroll up/down เวลากด nav link
    $('.nav-link').click(function() {
        let target = $(this.hash);
        if (target.offset() != null) {
            $('html,body').animate({
                scrollTop: target.offset().top - 10    // margin-top ประมาณ 10px
            }, 900);    // 900 คือ ความเร็วในการ scroll
        }
    });

    // When scroll down change background color
    $(window).bind('scroll', function() {
        // var windHeight = $(window).height() - ($(window).height() * (3/4));
        var navHeight = $('.navbar').height();
        if ($(window).scrollTop() > navHeight) {
            $('.navbar').css("background-color", "#111111");
        } else {
            if ($(window).width() <= 991) {
                if ( $('#navContent').is(':visible') ) {
                    $('.navbar').css("background-color", "#111111");
                } else {
                    $('.navbar').css("background-color", "transparent");
                }
            }
            else {
                $('.navbar').css("background-color", "transparent");
            }
        }
    });

    // สำหรับหน้าจอขนาดเล็ก...
    $('.navbar-toggler').click(function() {
        if ( $('#navContent').is(':visible') ) {
            const windowTOP = $(window).scrollTop();
            const hNAV = $('.navbar').height();

            if (windowTOP > hNAV) {
                $('.navbar').css("background-color", "#111111");
            } else {
                $('.navbar').css("background-color", "transparent");
            }
        } else {
            $('.navbar').css("background-color", "#111111");
        }
    });
}


// พิมพ์เฉพาะตัวเลข
function keyOnlyNumber(event) {
    var x = event.charCode;
    return  (x >= 48 && x <= 57);
}



// ========== Function กำหนดรหัส ========== //
// สลับตัวอักษร
function swapString(s) {
	let i = 0;
    let swapStr = '';
    while (i < s.length) {
        const char = s.charAt(i);
        swapStr = char + swapStr;
        i++;
    }
    return swapStr;
}
// เปลี่ยนพิมพ์เล็กเป็นพิมใหญ่
function upLowString(s) {
    let stri = swapString(s);
	let i = 0;
    let upLowStr = '';
    while (i < stri.length) {
        let char = stri.charAt(i);
        if (char === char.toUpperCase() && char !== char.toLowerCase()) {
			upLowStr = upLowStr + char.toLowerCase();
		}
        else if (char === char.toLowerCase() && char !== char.toUpperCase()) {
			upLowStr = upLowStr + char.toUpperCase();
		}
        else {
			upLowStr = upLowStr + char;
        }
        i++;
    }
    return upLowStr;
}
// ทำให้เป็นรหัส
function codeString(s) {
	let i = 0;
    let codeStr = '';
    while (i < s.length) {
        const char = s.charCodeAt(i);
        codeStr = codeStr + char;
        i++;
    }
    return codeStr;
}




/* ========== ฟังชันเรียกใช้ ajax ========== */
function callAjax(jsPath, tabShow, tabClass) {
    $.ajax({
        url:    jsPath,
        type:   'POST',
        // data:   postVal,
        success: function(arrNum) {
            // console.log(arrNum, tabShow, tabClass);
            let classSpnInTab = document.getElementsByClassName(tabClass);
            if (tabShow != 0) {
                if (typeof arrNum != 'object') {
                    location.reload();
                }
                else {
                    const iSpn = tabShow - 1;
                    const nowNum = classSpnInTab[iSpn].innerText;
                    const num = arrNum[iSpn];
    
                    if ( num > nowNum ) {
                        location.reload();
                    }
                }
            } else {
                if (typeof arrNum != 'object') {
                    location.reload();
                }
            }

            for (let i = 0; i < classSpnInTab.length; i++) {
                const num = arrNum[i];
                classSpnInTab[i].innerText = num;
                if (num > 0) {
                    classSpnInTab[i].classList.add('spannums');
                } else {
                    classSpnInTab[i].classList.remove('spannums');
                }
            }
        }
        , error: function(jqXHR, textStatus, err){
            // alert('text status ' + textStatus + ', err ' + err)
            location.reload();
        }
    });
}

// function callAjaxNoReload(jsPath, postVal, btnId) {
//     $.ajax({
//         url:    jsPath,
//         type:   'POST',
//         data:   postVal,
//         success: function(num){
//             // alert('Success! ' + num)
//             $(btnId).text(num);
//             if (num > 0) {
//                 $(btnId).addClass("spannums");
//             } else {
//                 $(btnId).removeClass("spannums");
//             }

//             if ( isNaN(parseInt(num)) ) {
//                 location.reload();
//             }
//         }
//     });
// }


/* ===== กรณีพิมพ์วันที่เอง ===== */
function isValidDate(year, month, date) {
    // ตรวจสอบวันที่ถูกต้องมั้ย? เช่น 2021-02-31 ผิด เป็นต้น
    const in2d = new Date(year, month, date);
    if (in2d.getFullYear() == year && in2d.getMonth() == month && in2d.getDate() == date) {
        return true;
    } else {
        return false;
    }
}
function isValidPatternDate(strdate) {
    // ตรวจสอบรูปแบบวันที่
    const datePattern = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|1\d|2\d|3[01])$/;
    if ( datePattern.test(strdate) ) {
        return true;
    } else {
        return false;
    }
}
function checkT1T2(d1, d2, t1, t2) {
    if ( d1 == d2 ) {  // ถ้าวันที่ยืมกับคืนเป็นวันเดียวกัน
        const t1hh = parseInt(t1.substr(0,2));
        const t2hh = parseInt(t2.substr(0,2));
        const t1mn = parseInt(t1.substr(3,2));
        const t2mn = parseInt(t2.substr(3,2));
        
        if ( (t2hh < t1hh) || (t2hh == t1hh && t2mn < t1mn) ) {
            $('#errT1').text('เวลายืมต้องน้อยกว่าเวลาคืน!');
            $('#errT2').text('เวลาคืนต้องน้อยกว่าเวลายืม!');
            $('#errT1').show();
            $('#errT2').show();
            return false;
        } else {
            $('#errT1').hide();
            $('#errT2').hide();
            return true;
        }
    } else {
        $('#errT1').hide();
        $('#errT2').hide();
        return true;
    }
}



