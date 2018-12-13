/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
var numDivs = 0;
var selDiv = -1;
var selSection = -1;
var numSections = 0;
var curSection = -1;
var divType = -1;
var divs = {};
var divProp = {};

function xml2json(xml, tab) {
    var X = {
        toObj: function (xml) {
            var o = {};
            if (xml.nodeType == 1) {   // element node ..
                if (xml.attributes.length)   // element with attributes  ..
                    for (var i = 0; i < xml.attributes.length; i++)
                        o["@" + xml.attributes[i].nodeName] = (xml.attributes[i].nodeValue || "").toString();
                if (xml.firstChild) { // element has child nodes ..
                    var textChild = 0, cdataChild = 0, hasElementChild = false;
                    for (var n = xml.firstChild; n; n = n.nextSibling) {
                        if (n.nodeType == 1)
                            hasElementChild = true;
                        else if (n.nodeType == 3 && n.nodeValue.match(/[^ \f\n\r\t\v]/))
                            textChild++; // non-whitespace text
                        else if (n.nodeType == 4)
                            cdataChild++; // cdata section node
                    }
                    if (hasElementChild) {
                        if (textChild < 2 && cdataChild < 2) { // structured element with evtl. a single text or/and cdata node ..
                            X.removeWhite(xml);
                            for (var n = xml.firstChild; n; n = n.nextSibling) {
                                if (n.nodeType == 3)  // text node
                                    o["#text"] = X.escape(n.nodeValue);
                                else if (n.nodeType == 4)  // cdata node
                                    o["#cdata"] = X.escape(n.nodeValue);
                                else if (o[n.nodeName]) {  // multiple occurence of element ..
                                    if (o[n.nodeName] instanceof Array)
                                        o[n.nodeName][o[n.nodeName].length] = X.toObj(n);
                                    else
                                        o[n.nodeName] = [o[n.nodeName], X.toObj(n)];
                                } else  // first occurence of element..
                                    o[n.nodeName] = X.toObj(n);
                            }
                        } else { // mixed content
                            if (!xml.attributes.length)
                                o = X.escape(X.innerXml(xml));
                            else
                                o["#text"] = X.escape(X.innerXml(xml));
                        }
                    } else if (textChild) { // pure text
                        if (!xml.attributes.length)
                            o = X.escape(X.innerXml(xml));
                        else
                            o["#text"] = X.escape(X.innerXml(xml));
                    } else if (cdataChild) { // cdata
                        if (cdataChild > 1)
                            o = X.escape(X.innerXml(xml));
                        else
                            for (var n = xml.firstChild; n; n = n.nextSibling)
                                o["#cdata"] = X.escape(n.nodeValue);
                    }
                }
                if (!xml.attributes.length && !xml.firstChild)
                    o = null;
            } else if (xml.nodeType == 9) { // document.node
                o = X.toObj(xml.documentElement);
            } else
                alert("unhandled node type: " + xml.nodeType);
            return o;
        },
        toJson: function (o, name, ind) {
            var json = name ? ("\"" + name + "\"") : "";
            if (o instanceof Array) {
                for (var i = 0, n = o.length; i < n; i++)
                    o[i] = X.toJson(o[i], "", ind + "\t");
                json += (name ? ":[" : "[") + (o.length > 1 ? ("\n" + ind + "\t" + o.join(",\n" + ind + "\t") + "\n" + ind) : o.join("")) + "]";
            } else if (o == null)
                json += (name && ":") + "null";
            else if (typeof (o) == "object") {
                var arr = [];
                for (var m in o)
                    arr[arr.length] = X.toJson(o[m], m, ind + "\t");
                json += (name ? ":{" : "{") + (arr.length > 1 ? ("\n" + ind + "\t" + arr.join(",\n" + ind + "\t") + "\n" + ind) : arr.join("")) + "}";
            } else if (typeof (o) == "string")
                json += (name && ":") + "\"" + o.toString() + "\"";
            else
                json += (name && ":") + o.toString();
            return json;
        },
        innerXml: function (node) {
            var s = ""
            if ("innerHTML" in node)
                s = node.innerHTML;
            else {
                var asXml = function (n) {
                    var s = "";
                    if (n.nodeType == 1) {
                        s += "<" + n.nodeName;
                        for (var i = 0; i < n.attributes.length; i++)
                            s += " " + n.attributes[i].nodeName + "=\"" + (n.attributes[i].nodeValue || "").toString() + "\"";
                        if (n.firstChild) {
                            s += ">";
                            for (var c = n.firstChild; c; c = c.nextSibling)
                                s += asXml(c);
                            s += "</" + n.nodeName + ">";
                        } else
                            s += "/>";
                    } else if (n.nodeType == 3)
                        s += n.nodeValue;
                    else if (n.nodeType == 4)
                        s += "<![CDATA[" + n.nodeValue + "]]>";
                    return s;
                };
                for (var c = node.firstChild; c; c = c.nextSibling)
                    s += asXml(c);
            }
            return s;
        },
        escape: function (txt) {
            return txt.replace(/[\\]/g, "\\\\")
                    .replace(/[\"]/g, '\\"')
                    .replace(/[\n]/g, '\\n')
                    .replace(/[\r]/g, '\\r');
        },
        removeWhite: function (e) {
            e.normalize();
            for (var n = e.firstChild; n; ) {
                if (n.nodeType == 3) {  // text node
                    if (!n.nodeValue.match(/[^ \f\n\r\t\v]/)) { // pure whitespace text node
                        var nxt = n.nextSibling;
                        e.removeChild(n);
                        n = nxt;
                    } else
                        n = n.nextSibling;
                } else if (n.nodeType == 1) {  // element node
                    X.removeWhite(n);
                    n = n.nextSibling;
                } else                      // any other node
                    n = n.nextSibling;
            }
            return e;
        }
    };
    if (xml.nodeType == 9) // document node
        xml = xml.documentElement;
    var json = X.toJson(X.toObj(X.removeWhite(xml)), xml.nodeName, "\t");
    return "{\n" + tab + (tab ? json.replace(/\t/g, tab) : json.replace(/\t|\n/g, "")) + "\n}";
}


function selectControls() {
    
}
function completeCtrlSelection() {
    return;
}

function onSelectionPanelToggle(){
    onControlsSelectionToggle();
}


function onControlsSelectionToggle(){
    if($("#controlsSelection").width() <= 20) {
        $("#selection").animate({width: '20%'});
        $("#controlsSelection").animate({width: '20%'});
        $("#wrapper").animate({left: '20%'});
        
        $("#selection_right").hide();
        $("#selection_left").show();
        $("#controls_selection_right").hide();
        $("#controls_selection_left").show();
        
    } else { 
        $("#selection").animate({width: '20px'});
        $("#controlsSelection").animate({width: '20px'});
        $("#wrapper").animate({left: '20px'});

        $("#selection_left").hide();
        $("#selection_right").show();
        $("#controls_selection_left").hide();
        $("#controls_selection_right").show();
        
    }
}

function onEditorPropertiesToggle(){
    onEditorToolboxToggle();
}

function onEditorToolboxToggle(){
    //println("onSelectionPanelToggle()");
    if($("#editorToolbox").width() <= 20) {
        $("#editorToolbox").animate({width: '20%'});
        $("#editorProperties").animate({width: '20%'});
        $("#wrapper").animate({right: '20%'});
        
        $("#toolbox_left").hide();
        $("#toolbox_right").show();
        $("#properties_left").hide();
        $("#properties_right").show();
    } else { 
        $("#editorToolbox").animate({width: '20px'});
        $("#editorProperties").animate({width: '20px'});
        $("#wrapper").animate({right: '20px'});
        
        $("#toolbox_right").hide();
        $("#toolbox_left").show();
        $("#properties_right").hide();
        $("#properties_left").show();        
    }
 //toggle("size", { to: { width: 200, height: 600 } }, 500);
}

function createProject(name){
    $("#editorFormContent").html("");
    $("#controlsSelectionContent").html("");
    numDivs = 0;
    selDiv = -1;
    selSection = -1;
    numSections = 0;
    curSection = -1;
    divType = -1;
    divs = {};
    
    loadPage(divs);
}

function onNewProject(){
    $("#mainPage").hide();
    $("#blackGlass").show();
    $("#newProjectDialog").show();
}

function onOpenProject() {
    $("#projectFile").click();
}

function fixXML(xml){
    return xml.substring(5, xml.length - 6);//exclude <xml> tag
}

function onProjectFileLoad(){
    var fileToLoad = event.target.files[0];

    if (fileToLoad) {
        var reader = new FileReader();
        reader.onload = function (fileLoadedEvent) {
            var textFromFileLoaded = fileLoadedEvent.target.result;

            $("#editorFormContent").html("");
            $("#controlsSelectionContent").html("");

            numDivs = 0;
            selDiv = -1;
            selSection = -1;
            numSections = 0;
            curSection = -1;
            divType = -1;
            
            divs = JSON.parse(textFromFileLoaded);
            //var parser = new DOMParser();
            //var xml = parser.parseFromString(textFromFileLoaded, "text/xml");            
            //var json = xml2json(xml);
            //divs = JSON.parse(json.replace("undefined", ""))["xml"];
            
            if (divs == null || divs.length == 0)
                divs = {};
            loadPage(divs);
            $("#projectFile").val("");
            
        };
        reader.readAsText(fileToLoad, 'UTF-8');
    }    
}

function loadPage(divs) {
    jQuery.each(divs, function () {
        var div = this;
        var divType = div["divType"];
        var numDiv = div["num"];

        switch (divType) {
            case 1:
                strDivType = "Section";
                //selSection = numDivs + 1; 
                //var top1 = 150*(selSection-1);//event.pageY - itemHeight / 2;
                //borderRadius = "50%";
                break;
            case 2:
                strDivType = "Text";
                break;
            case 3:
                strDivType = "Image";
                break;
            case 4:
                strDivType = "Grid";
                break;
            case 5:
                strDivType = "Menu";
                break;
            case 6:
                strDivType = "Input";
                break;
            case 7:
                strDivType = "Button";
                break;
        }

        var obj = document.createElement("div");
        var itemWidth = div["width"];
        var itemHeight = div["height"];
        var left = div["left"];
        var top = div["top"];

        var unit = divType === 1 ? "%" : "px";

        obj.id = div["id"];
        if (divType === 1) {
            obj.style.position = "relative";

            obj.style.float = "left";
            obj.style.clear = "left";
            obj.style.zIndex = 1;
            obj.style.boxSizing = "border-box";
        } else {
            obj.style.position = "absolute";
            obj.style.top = top + "px";
            obj.style.left = left + "px";
            obj.style.zIndex = 2;
            //obj.style.float = "left";
        }
        obj.style.height = itemHeight + "px";
        obj.style.width = itemWidth + unit;
        obj.style.border = "1px dashed gray";

        //obj.style.borderRadius = borderRadius;
        obj.value = numDiv;

        if (divType === 7) {
            obj.innerHTML = "<button id='" + obj.id + "_button' style='pointer-events:none; margin-top: 0px; z-index:1; height:100%;width:100%;'></button>";
        }

        if (divType === 3) {
            obj.innerHTML = "<img id='" + obj.id + "_image' style='height:100%;width:100%;'/>";
        }

        if (divType === 2) {
            obj.innerHTML = "<div id='" + obj.id + "_text' style='height:100%;width:100%;'></div>";
        }

        if (divType == 1) {
            html = "<div id='d" + numDiv + "' style='margin-top:10px; clear:left; float: left;'>";
            //checkbox
            html += "<div style='box-sizing: border-box; width:20px; height:20px;  border:1px solid gray; float:left;' onclick='toggleDivDetails(" + numDiv + ")'></div>";
            //div name
            html += "<div id='divItem" + numDiv + "' style='box-sizing: border-box; height:20px; width:200px; border:1px dashed gray; float:left; line-height: 20px; text-indent:10px;' onclick='onDivItemClick(" + numDiv + ")'>" + strDivType + numDiv + "</div>";
            //details
            html += "<div id='d" + numDiv + "_details' style='margin-left:20px; margin-top:10px; width:200px; clear:left;float:left;display:none;'>";
            html += "</div>";

            html += "</div>";

            $("#controlsSelectionContent").append(html);



        } else {
            selSection = div["section"];
            html = "<div id='d" + numDiv + "' style='clear:left; float: left;'>";
            //div name
            html += "<div id='divItem" + numDiv + "' style='text-indent:10px; box-sizing: border-box; border:1px dashed gray; height:20px; width:200px;float:left; line-height: 20px;' onclick='onDivItemClick(" + numDiv + ")'>" + strDivType + numDiv + "</div>";
            html += "</div>";

            $("#d" + selSection + "_details").append(html);
            $("#d" + selSection + "_details").show();
        }
///////////////////////////////////////////////

        numDivs++;


        if (divType !== 1) {
            selSection = div["section"];
            $("#div" + selSection)[0].appendChild(obj);
            if (divType === 3) { //image
                var src = div["source"];
                $("#" + obj.id + "_image").attr("src", src);
            }

            if (divType === 2) { //text
                var text = div["text"];
                var fontSize = div["font-size"];
                var fontWeight = div["font-weight"];
                var textAlign = div["text-align"];

                $("#" + obj.id + "_text").html(text);
                $("#" + obj.id).css("font-size", fontSize + "px");
                $("#" + obj.id).css("font-weight", fontWeight);
                $("#" + obj.id).css("text-align", textAlign);

                var bc = div["background-color"];
                var fc = div["color"];
                $("#" + obj.id).css("background-color", bc);
                $("#" + obj.id).css("color", fc);

            }

            if (divType === 7) { //button
                var text = div["text"];
                var fontSize = div["font-size"];
                var fontWeight = div["font-weight"];
                var textAlign = div["text-align"];

                $("#" + obj.id + "_button").html(text);
                $("#" + obj.id + "_button").css("font-size", fontSize + "px");
                $("#" + obj.id + "_button").css("font-weight", fontWeight);

                var bc = div["background-color"];
                var fc = div["color"];
                $("#" + obj.id + "_button").css("background-color", bc);
                $("#" + obj.id + "_button").css("color", fc);

            }
        } else {
            $("#editorFormContent")[0].appendChild(obj);

            var bc = div["background-color"];
            $("#" + obj.id).css("background-color", bc);

        }

        selDiv = obj.id;


        $("#" + obj.id).resizable({
            //containment: '#editorFornContent',
            resize: function (event, ui) {
                selDiv = $(this)[0].id;

                var width = $(this).width();
                var height = $(this).height();


                divs[selDiv]["width"] = width;
                divs[selDiv]["height"] = height;

                showDivProp();

                event.stopImmediatePropagation();
                event.preventDefault();

            }
        });

        if (divType != 1) {
            $("#" + obj.id).draggable({
                containment: divType === 1 ? "#editorFormContent" : "#div" + selSection,
                drag: function (event, ui) {
                    var objID = $(this)[0].id;


                    var num = divs[objID]["num"];
                    var section = divs[objID]["section"];

                    $("#d" + section + "_details").show();
                    $("#divItem" + num)[0].scrollIntoView(false);

                    var left = $(this)[0].offsetLeft;
                    var top = $(this)[0].offsetTop;

                    //event.stopImmediatePropagation();
                    //event.preventDefault();

                    divs[objID]["left"] = left;
                    divs[objID]["top"] = top;

                    selectDiv(objID);

//$("#controlLeft").val(left);
//$("#controlTop").val(top);

                }
            });
        }

        $("#" + obj.id).bind('click', function (e) {

            selectDiv(obj.id);
            var num = divs[obj.id]["num"];
            var divType = divs[obj.id]["divType"];

            selSection = divType === 1 ? num : divs[obj.id]["section"];

            $("#d" + selSection + "_details").show();
            $("#divItem" + num)[0].scrollIntoView(false);

            showDivProp();

            e.stopImmediatePropagation();
            e.preventDefault();

        });
        
        $("#" + obj.id).bind('dblclick', function (e) {

            alert("dblclick");

            e.stopImmediatePropagation();
            e.preventDefault();

        });        
    });
}

function onSave() {
    myStorage = window.localStorage;
    var jsonDivs = JSON.stringify(divs);
    
    myStorage.setItem('pro.skyforce.aero.divs', jsonDivs);

}

function onSaveAs() {
    if ('Blob' in window) {
        //var fileName = prompt('Please enter file name to save', 'Untitled.json');
        var fileName = prompt('Please enter file name to save', 'Untitled.json');
        if (fileName) {
            var jsonDivs = JSON.stringify(divs, null, 4);
            var textFileAsBlob = new Blob([jsonDivs], {type: 'text/plain'});

            //var xmlDivs = json2xml(divs);
            //xmlDivs = "<xml>" + xmlDivs + "</xml>";
            
            
            //var textFileAsBlob = new Blob([xmlDivs], {type: 'text/plain'});

            if ('msSaveOrOpenBlob' in navigator) {
                navigator.msSaveOrOpenBlob(textFileAsBlob, fileName);
            } else {
                var downloadLink = document.createElement('a');
                downloadLink.download = fileName;
                downloadLink.innerHTML = 'Download File';
                if ('webkitURL' in window) {
                    // Chrome allows the link to be clicked without actually adding it to the DOM.
                    downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
                } else {
                    // Firefox requires the link to be added to the DOM before it can be clicked.
                    downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
                    downloadLink.onclick = destroyClickedElement;
                    downloadLink.style.display = 'none';
                    document.body.appendChild(downloadLink);
                }

                downloadLink.click();
            }
        }
    } else {
        alert('Your browser does not support the HTML5 Blob.');
    }
}

function destroyClickedElement(event) {
    document.body.removeChild(event.target);
}

function onLoad() {
    myStorage = window.localStorage;
    var jsonDivs = myStorage.getItem('pro.skyforce.aero.divs');
    divs = JSON.parse(jsonDivs);
    if (divs == null || divs.length == 0)
        divs = {};

    loadPage(divs);

}

function showDivProp() {
    var numWindow = 1;
    var docTypeID = 1;



    var html = "";
    var num = 0;
    divType = divs[selDiv]["divType"];



    propControls = [];//dashProp[dashboardItemType];
    jQuery.each(divProp[divType], function () {
        var dashCtrlProp = this;
        propControls.push(this);
        var readonly = "";//"readonly"
        var propName = dashCtrlProp["Name"];
        var propCaption = dashCtrlProp["Caption"];
        var propType = dashCtrlProp["Type"];


        var input = "<input id='propControl" + propCaption + "' " + readonly + " style='position: absolute; background:transparent; color:#B3B3B3; border:1px solid #B3B3B3; right:0px; width: 200px;' type=\"text\" name=\"item\" value=\"" + divs[selDiv][propName] + "\" maxlength=\"255\" oninput=\"updateDivCtrlProp('propControl" + propCaption + "', '" + propName + "');\" />";
        html += "<div style='position:relative; clear:left; float:left;width:300px; height:19px;'>";
        html += "<div style='position:absolute; height:100%;width:100px;'>" + propCaption + "</div>";
        html += "<div style='position:absolute;left:100px;height:100%;right:0px;'>";
        html += "<div style='position:absolute; width:100%;height: 100%;'>" + input + "</div>";
        html += "</div>";
        html += "</div>";


        num++;
    });

    $("#editorPropertiesContent").html(html);
    //$("#properties-content").html(html);    
    $("#editorPropertiesContent").show();
}

function continueCtrlSelection() {

}


function allowDrop(ev) {
    ev.preventDefault();
    //var data = ev.dataTransfer.getData("text");
}

function dragSection(ev) {
    divType = 1;
    ev.dataTransfer.setData("text", ev.target.id);
}

function dragText(ev) {
    divType = 2;
    ev.dataTransfer.setData("text", ev.target.id);
}

function dragImage(ev) {
    divType = 3;
    ev.dataTransfer.setData("text", ev.target.id);
}

function dragGrid(ev) {
    divType = 4;
    ev.dataTransfer.setData("text", ev.target.id);
}

function dragMenu(ev) {
    divType = 5;
    ev.dataTransfer.setData("text", ev.target.id);
}

function dragInput(ev) {
    divType = 6;
    ev.dataTransfer.setData("text", ev.target.id);
}

function dragButton(ev) {
    divType = 7;
    ev.dataTransfer.setData("text", ev.target.id);
}

function toggleDivDetails(num) {
    $("#d" + num + "_details").toggle();
}

function onDivItemClick(numDiv) {
    objID = "div" + numDiv;
    selectDiv(objID);

    $("#" + objID)[0].scrollIntoView(false);
}

function selectDiv(objID) {
    selDiv = objID;
    var divType = divs[selDiv]["divType"];

    jQuery.each(divs, function () {
        var id = this["id"];
        var num = this["num"];
        var otherDivType = this["divType"];

        $("#" + id).css('border', "1px dashed gray");


        if (otherDivType !== 1) {
            $("#" + id).css('z-index', "2");
        }

        $("#divItem" + num).removeClass("selectedDivItem");

    });


    $("#" + selDiv).css('border', "2px solid gray");

    if (divType !== 1) {
        $("#" + selDiv).css('z-index', "3");
    }

    if (divType === 1) { //section
        selSection = divs[selDiv]["num"];
    } else {
        selSection = divs[selDiv]["section"];
    }

    var numDiv = divs[selDiv]["num"];
    $("#divItem" + numDiv).addClass("selectedDivItem");

    showDivProp();
}

function getLastNumDiv(divs) {
    var lastNum = 0;
    jQuery.each(divs, function () {
        var num = this["num"];
        lastNum = Math.max(num, lastNum);
    });
    return lastNum;
}

function dropOnEditor(event) {
    var itemWidth;
    var itemHeight;
    //var borderRadius = "";

    var strDivType;
    var top1 = 0;//event.pageY - itemHeight / 2;


    switch (divType) {
        case 1:
            itemWidth = 100;
            itemHeight = 150;
            numSections++;
            strDivType = "Section";
            selSection = numDivs + 1;
            //var top1 = 150*(selSection-1);//event.pageY - itemHeight / 2;
            //borderRadius = "50%";
            break;
        case 2:
            top1 = 0;
            itemWidth = 100;
            itemHeight = 20;
            strDivType = "Text";
            break;
        case 3:
            top1 = 0;
            itemWidth = 150;
            itemHeight = 150;
            strDivType = "Image";
            break;
        case 4:
            top1 = 0;
            itemWidth = 150;
            itemHeight = 150;
            strDivType = "Grid";
            break;
        case 5:
            top1 = 0;
            itemWidth = 100;
            itemHeight = 20;
            strDivType = "Menu";
            break;
        case 6:
            top1 = 0;
            itemWidth = 100;
            itemHeight = 20;
            strDivType = "Input";
            break;
        case 7:
            top1 = 0;
            itemWidth = 100;
            itemHeight = 20;
            strDivType = "Button";
            break;

    }


    var top0 = $("#editorFormContent").offset().top;
    var left0 = $("#editorFormContent").offset().left;


    var left1 = 0;//event.pageX - itemWidth / 2;

    var offsetY = top1; //Math.max(0, top1 - top0);
    var offsetX = 0;//Math.max(0, left1 - left0);

    var unit = divType === 1 ? "%" : "px";

    var obj = document.createElement("div");// divType !== 3 ? document.createElement("div") : document.createElement("img");

    numDivs = getLastNumDiv(divs);

    obj.id = "div" + (numDivs + 1);

    if (divType === 1) {
        obj.style.position = "relative";

        obj.style.float = "left";
        obj.style.clear = "left";
        obj.style.zIndex = 1;
        obj.style.boxSizing = "border-box";
    } else {
        obj.style.position = "absolute";
        obj.style.top = 0 + "px";
        obj.style.left = 0 + "px";
        obj.style.zIndex = 2;
        //obj.style.float = "left";
    }
    obj.style.height = itemHeight + "px";
    obj.style.width = itemWidth + unit;
    obj.style.border = "1px dashed gray";

    //obj.style.borderRadius = borderRadius;
    obj.value = numDivs + 1;

    if (divType === 7) {
        obj.innerHTML = "<button id='" + obj.id + "_button' style='pointer-events:none; margin-top: 0px; z-index:1; height:100%;width:100%;'></button>";
    }

    if (divType === 3) {
        obj.innerHTML = "<img id='" + obj.id + "_image' style='height:100%;width:100%;'/>";
    }

    if (divType === 2) {
        obj.innerHTML = "<div id='" + obj.id + "_text' style='height:100%;width:100%;'></div>";
    }

    divs[obj.id] = {
        id: obj.id,
        num: numDivs + 1,
        divType: divType,
        top: divType == 1 ? offsetY : 0,
        left: 0,
        height: itemHeight,
        width: itemWidth,
        border: "1px dashed gray",
        //borderRadius: obj.style.borderRadius,
        value: obj.value,
        variable: '',
        section: divType !== 1 ? selSection : null //parent section
    };



///////////////////////////////////////////////////////////////////////////////////////////

    if (divType == 1) {
        html = "<div id='d" + (numDivs + 1) + "' style='margin-top:10px; clear:left; float: left;'>";
        //checkbox
        html += "<div style='box-sizing: border-box; width:20px; height:20px;  border:1px solid gray; float:left;' onclick='toggleDivDetails(" + (numDivs + 1) + ")'></div>";
        //div name
        html += "<div id='divItem" + (numDivs + 1) + "' style='box-sizing: border-box; height:20px; width:200px; border:1px dashed gray; float:left; line-height: 20px; text-indent:10px;' onclick='onDivItemClick(" + (numDivs + 1) + ")'>" + strDivType + (numDivs + 1) + "</div>";
        //details
        html += "<div id='d" + (numDivs + 1) + "_details' style='margin-left:20px; margin-top:10px; width:200px; clear:left;float:left;display:none;'>";
        html += "</div>";

        html += "</div>";

        $("#controlsSelectionContent").append(html);



    } else {
        html = "<div id='d" + (numDivs + 1) + "' style='clear:left; float: left;'>";
        //div name
        html += "<div id='divItem" + (numDivs + 1) + "' style='text-indent:10px; box-sizing: border-box; border:1px dashed gray; height:20px; width:200px;float:left; line-height: 20px;' onclick='onDivItemClick(" + (numDivs + 1) + ")'>" + strDivType + (numDivs + 1) + "</div>";
        html += "</div>";

        $("#d" + selSection + "_details").append(html);
        $("#d" + selSection + "_details").show();
    }
///////////////////////////////////////////////

    numDivs++;


    if (divType !== 1) {
        $("#div" + selSection)[0].appendChild(obj);
    } else {
        $("#editorFormContent")[0].appendChild(obj);
    }

    selDiv = obj.id;

    $("#" + selDiv)[0].scrollIntoView(false);


    $("#" + obj.id).resizable({
        //containment: '#editorFornContent',
        resize: function (event, ui) {
            selDiv = $(this)[0].id;


            var width = $(this).width();
            var height = $(this).height();


            divs[selDiv]["width"] = width;
            divs[selDiv]["height"] = height;

            showDivProp();

            event.stopImmediatePropagation();
            event.preventDefault();
        }
    });

    if (divType != 1) {
        $("#" + obj.id).draggable({
            containment: divType === 1 ? "#editorFormContent" : "#div" + selSection,
            drag: function (event, ui) {
                var objID = $(this)[0].id;

                var num = divs[objID]["num"];
                var section = divs[objID]["section"];

                $("#d" + section + "_details").show();
                $("#divItem" + num)[0].scrollIntoView(false);

                var left = $(this)[0].offsetLeft;
                var top = $(this)[0].offsetTop;

                //event.stopImmediatePropagation();
                //event.preventDefault();

                divs[objID]["left"] = left;
                divs[objID]["top"] = top;

                selectDiv(objID);

            }
        });
    }

    $("#" + obj.id).bind('click', function (e) {

        selectDiv(obj.id);
        var num = divs[obj.id]["num"];
        var divType = divs[obj.id]["divType"];

        selSection = divType === 1 ? num : divs[obj.id]["section"];

        $("#d" + selSection + "_details").show();
        $("#divItem" + num)[0].scrollIntoView(false);

        showDivProp();

        e.stopImmediatePropagation();
        e.preventDefault();

    });

    $("#" + obj.id).bind('dblclick', function (e) {

        alert("dblclick");

        e.stopImmediatePropagation();
        e.preventDefault();

    });


    selectDiv(obj.id);
    //showDivProp();
}

function updateDivCtrlProp(controlName, itemProp) {
    var v = $("#" + controlName).val();
    divs[selDiv][itemProp] = v;
    var divType = divs[selDiv]["divType"];

    var postfix = divType == 7 ? "_button" : "";//make it using switch/case

    if (divProp[divType][itemProp]["IsStyle"]) {
        if (divType === 3 && itemProp === "source") {
            $("#" + selDiv + "_image").attr("src", v);
        } else if (divType != 7) {
            var unit = divProp[divType][itemProp]["StyleUnit"] === undefined ? "" : divProp[divType][itemProp]["StyleUnit"];
            $("#" + selDiv + postfix).css(itemProp, v + unit);
        }
    }

    if (divType === 2 && itemProp === "text") { //text
        $("#" + selDiv + "_text").html(v);
    }


    if (divType === 7) {
        var unit = divProp[divType][itemProp]["StyleUnit"] === undefined ? "" : divProp[divType][itemProp]["StyleUnit"];
        if (itemProp === "text") {
            $("#" + selDiv + postfix).html(v);
        } else if (itemProp === "height" ||
                itemProp === "width" ||
                itemProp === "left" ||
                itemProp === "top") {
            $("#" + selDiv).css(itemProp, v + unit);
        } else {
            $("#" + selDiv + postfix).css(itemProp, v + unit);
        }
    }

    if (divProp[divType][itemProp]["OnChange"]) {
        var code = divProp[divType][itemProp]["OnChange"] + "(" + v + ");";
        eval(code);
    }
}

function createMenu() {
    html = "<a href=\"#\">File</a><ul style='display:none; z-index:999; width:250px;'>";

    html += "<li style='z-index:2;' onclick='onNewProject();'><a href=\"#0\">";
    html += "New project...";
    html += "</li>";

    html += "<li style='z-index:2;' onclick='onOpenProject();'><a href=\"#0\">";
    html += "Open project...";
    html += "</li>";


    html += "<li id='saveObject' style='z-index:2;' onclick='onSave();'><a href=\"#0\">";
    html += "<svg style='float:left; opacity:0.7;' fill='gray' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'>";
    html += "<path d='M0 0h24v24H0z' fill='none'/>";
    html += "<path d='M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z'/>";
    html += "</svg>Save";
    html += "</li>";

    html += "<li id='saveObjectAs' style='z-index:2;' onclick='onSaveAs();'><a href=\"#0\">";
    html += "<svg style='float:left; opacity:0.7;' fill='gray' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'>";
    html += "<path d='M0 0h24v24H0z' fill='none'/>";
    html += "<path d='M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z'/>";
    html += "</svg>Save As";
    html += "</li>";

    html += "</ul>";

    $("#topNavFile").html(html);

    html = "<a href=\"#\">Edit</a><ul style='display:none; z-index:999; width:250px;'>";

    html += "<li style='z-index:2;'><a href=\"#0\" onclick='alert(\"New\");'>";
    html += "Find...";
    html += "</li>";

    html += "<li style='z-index:2;'><a href=\"#0\" onclick='alert(\"delete document\");'>";
    html += "Find next";
    html += "</li>";

    html += "<li style='z-index:2;'><a href=\"#0\" onclick='alert(\"delete document\");'>";
    html += "Find prev";
    html += "</li>";

    html += "<li style='z-index:2;'><a href=\"#0\" onclick='alert(\"delete document\");'>";
    html += "Replace...";
    html += "</li>";

    html += "<li style='z-index:2;'><a href=\"#0\" onclick='alert(\"delete document\");'>";
    html += "Cut";
    html += "</li>";

    html += "<li style='z-index:2;'><a href=\"#0\" onclick='alert(\"delete document\");'>";
    html += "Copy";
    html += "</li>";

    html += "<li style='z-index:2;'><a href=\"#0\" onclick='alert(\"delete document\");'>";
    html += "Paste";
    html += "</li>";

    html += "</ul>";

    $("#topNavEdit").html(html);
}

$(document).keydown(function (e) {

    var altKey = e.altKey;
    var shiftKey = e.shiftKey;
    var ctrlKey = e.ctrlKey;
    if (ctrlKey && e.keyCode === 79) {
        var isVisible = $('#console').css("display") == "block";
        if (isVisible) {
            $('#console').hide();
        } else {
            $('#console').show();
        }

        e.preventDefault();
    }


    if (shiftKey && e.keyCode === 37) {
        moveLeft();
    }

    if (shiftKey && e.keyCode === 39) {
        moveRight();
    }

    if (shiftKey && e.keyCode === 38) {
        moveUp();
    }

    if (shiftKey && e.keyCode === 40) {
        moveDown();
    }


    if (shiftKey && e.keyCode === 46 && selDiv !== -1) {
        var divNum = divs[selDiv]["num"];

        $("#" + selDiv).remove();
        delete divs[selDiv];

        $("#d" + divNum).remove();
    }

});

$(document).ready(function () {

    var SECTION = 1;
    var TEXT = 2;
    var IMAGE = 3;
    var GRID = 4;
    var MENU = 5;
    var INPUT = 6;
    var BUTTON = 7;

    divProp = {};
    divProp[SECTION] = {};

    divProp[SECTION]["ID"] = {};
    divProp[SECTION]["ID"]["Name"] = "id";
    divProp[SECTION]["ID"]["Caption"] = "ID";
    divProp[SECTION]["ID"]["Type"] = "Text";
    divProp[SECTION]["ID"]["IsStyle"] = false;

    divProp[SECTION]["type"] = {};
    divProp[SECTION]["type"]["Name"] = "type";
    divProp[SECTION]["type"]["Caption"] = "Type";
    divProp[SECTION]["type"]["Type"] = "Text";
    divProp[SECTION]["type"]["IsStyle"] = false;

    divProp[SECTION]["height"] = {};
    divProp[SECTION]["height"]["Name"] = "height";
    divProp[SECTION]["height"]["Caption"] = "Height";
    divProp[SECTION]["height"]["Type"] = "Text";
    divProp[SECTION]["height"]["IsStyle"] = true;
    divProp[SECTION]["height"]["StyleUnit"] = 'px';

    divProp[SECTION]["width"] = {};
    divProp[SECTION]["width"]["Name"] = "width";
    divProp[SECTION]["width"]["Caption"] = "Width";
    divProp[SECTION]["width"]["Type"] = "Text";
    divProp[SECTION]["width"]["IsStyle"] = true;
    divProp[SECTION]["width"]["StyleUnit"] = '%';


    divProp[SECTION]["background-color"] = {};
    divProp[SECTION]["background-color"]["Name"] = "background-color";
    divProp[SECTION]["background-color"]["Caption"] = "Background";
    divProp[SECTION]["background-color"]["Type"] = "Text";
    divProp[SECTION]["background-color"]["IsStyle"] = true;

    /////////////////////////////////////////////////////////////////////////////
    divProp[TEXT] = {};

    divProp[TEXT]["ID"] = {};
    divProp[TEXT]["ID"]["Name"] = "id";
    divProp[TEXT]["ID"]["Caption"] = "ID";
    divProp[TEXT]["ID"]["Type"] = "Text";
    divProp[TEXT]["ID"]["IsStyle"] = false;

    divProp[TEXT]["type"] = {};
    divProp[TEXT]["type"]["Name"] = "type";
    divProp[TEXT]["type"]["Caption"] = "Type";
    divProp[TEXT]["type"]["Type"] = "Text";
    divProp[TEXT]["type"]["IsStyle"] = false;

    divProp[TEXT]["left"] = {};
    divProp[TEXT]["left"]["Name"] = "left";
    divProp[TEXT]["left"]["Caption"] = "Left";
    divProp[TEXT]["left"]["Type"] = "Text";
    divProp[TEXT]["left"]["IsStyle"] = true;
    divProp[TEXT]["left"]["StyleUnit"] = 'px';

    divProp[TEXT]["top"] = {};
    divProp[TEXT]["top"]["Name"] = "top";
    divProp[TEXT]["top"]["Caption"] = "Top";
    divProp[TEXT]["top"]["Type"] = "Text";
    divProp[TEXT]["top"]["IsStyle"] = true;
    divProp[TEXT]["top"]["StyleUnit"] = 'px';

    divProp[TEXT]["height"] = {};
    divProp[TEXT]["height"]["Name"] = "height";
    divProp[TEXT]["height"]["Caption"] = "Height";
    divProp[TEXT]["height"]["Type"] = "Text";
    divProp[TEXT]["height"]["IsStyle"] = true;
    divProp[TEXT]["height"]["StyleUnit"] = 'px';

    divProp[TEXT]["width"] = {};
    divProp[TEXT]["width"]["Name"] = "width";
    divProp[TEXT]["width"]["Caption"] = "Width";
    divProp[TEXT]["width"]["Type"] = "Text";
    divProp[TEXT]["width"]["IsStyle"] = true;
    divProp[TEXT]["width"]["StyleUnit"] = 'px';

    divProp[TEXT]["text"] = {};
    divProp[TEXT]["text"]["Name"] = "text";
    divProp[TEXT]["text"]["Caption"] = "Text";
    divProp[TEXT]["text"]["Type"] = "Text";
    divProp[TEXT]["text"]["IsStyle"] = false;

    divProp[TEXT]["font-family"] = {};
    divProp[TEXT]["font-family"]["Name"] = "font-family";
    divProp[TEXT]["font-family"]["Caption"] = "font-family";
    divProp[TEXT]["font-family"]["Type"] = "Text";
    divProp[TEXT]["font-family"]["IsStyle"] = false;


    divProp[TEXT]["font-size"] = {};
    divProp[TEXT]["font-size"]["Name"] = "font-size";
    divProp[TEXT]["font-size"]["Caption"] = "font-size";
    divProp[TEXT]["font-size"]["Type"] = "Text";
    divProp[TEXT]["font-size"]["IsStyle"] = true;
    divProp[TEXT]["font-size"]["StyleUnit"] = 'px';
    divProp[TEXT]["font-size"]["OnChange"] = "println('font size has changed')";

    divProp[TEXT]["font-weight"] = {};
    divProp[TEXT]["font-weight"]["Name"] = "font-weight";
    divProp[TEXT]["font-weight"]["Caption"] = "font-weight";
    divProp[TEXT]["font-weight"]["Type"] = "Text";
    divProp[TEXT]["font-weight"]["IsStyle"] = true;
    divProp[TEXT]["font-weight"]["StyleUnit"] = '';
    divProp[TEXT]["font-weight"]["OnChange"] = "";

    divProp[TEXT]["text-align"] = {};
    divProp[TEXT]["text-align"]["Name"] = "text-align";
    divProp[TEXT]["text-align"]["Caption"] = "text-align";
    divProp[TEXT]["text-align"]["Type"] = "Text";
    divProp[TEXT]["text-align"]["IsStyle"] = true;
    divProp[TEXT]["text-align"]["StyleUnit"] = '';
    divProp[TEXT]["text-align"]["OnChange"] = "";


    divProp[TEXT]["color"] = {};
    divProp[TEXT]["color"]["Name"] = "color";
    divProp[TEXT]["color"]["Caption"] = "Color";
    divProp[TEXT]["color"]["Type"] = "Text";
    divProp[TEXT]["color"]["IsStyle"] = true;

    divProp[TEXT]["background-color"] = {};
    divProp[TEXT]["background-color"]["Name"] = "background-color";
    divProp[TEXT]["background-color"]["Caption"] = "Background";
    divProp[TEXT]["background-color"]["Type"] = "Text";
    divProp[TEXT]["background-color"]["IsStyle"] = true;


    divProp[TEXT]["center"] = {};
    divProp[TEXT]["center"]["Name"] = "center";
    divProp[TEXT]["center"]["Caption"] = "Center";
    divProp[TEXT]["center"]["Type"] = "Text";
    divProp[TEXT]["center"]["IsStyle"] = true;

    /////////////////////////////////////////////////////////////////////////////  
    divProp[IMAGE] = {};

    divProp[IMAGE]["ID"] = {};
    divProp[IMAGE]["ID"]["Name"] = "id";
    divProp[IMAGE]["ID"]["Caption"] = "ID";
    divProp[IMAGE]["ID"]["Type"] = "Text";
    divProp[IMAGE]["ID"]["IsStyle"] = false;

    divProp[IMAGE]["type"] = {};
    divProp[IMAGE]["type"]["Name"] = "type";
    divProp[IMAGE]["type"]["Caption"] = "Type";
    divProp[IMAGE]["type"]["Type"] = "Text";
    divProp[IMAGE]["type"]["IsStyle"] = false;

    divProp[IMAGE]["left"] = {};
    divProp[IMAGE]["left"]["Name"] = "left";
    divProp[IMAGE]["left"]["Caption"] = "Left";
    divProp[IMAGE]["left"]["Type"] = "Text";
    divProp[IMAGE]["left"]["IsStyle"] = true;
    divProp[IMAGE]["left"]["StyleUnit"] = 'px';

    divProp[IMAGE]["top"] = {};
    divProp[IMAGE]["top"]["Name"] = "top";
    divProp[IMAGE]["top"]["Caption"] = "Top";
    divProp[IMAGE]["top"]["Type"] = "Text";
    divProp[IMAGE]["top"]["IsStyle"] = true;
    divProp[IMAGE]["top"]["StyleUnit"] = 'px';

    //divProp[IMAGE]["center"]["StyleUnit"] = 'px';


    divProp[IMAGE]["height"] = {};
    divProp[IMAGE]["height"]["Name"] = "height";
    divProp[IMAGE]["height"]["Caption"] = "Height";
    divProp[IMAGE]["height"]["Type"] = "Text";
    divProp[IMAGE]["height"]["IsStyle"] = true;
    divProp[IMAGE]["height"]["StyleUnit"] = 'px';

    divProp[IMAGE]["width"] = {};
    divProp[IMAGE]["width"]["Name"] = "width";
    divProp[IMAGE]["width"]["Caption"] = "Width";
    divProp[IMAGE]["width"]["Type"] = "Text";
    divProp[IMAGE]["width"]["IsStyle"] = true;
    divProp[IMAGE]["width"]["StyleUnit"] = 'px';

    divProp[IMAGE]["source"] = {};
    divProp[IMAGE]["source"]["Name"] = "source";
    divProp[IMAGE]["source"]["Caption"] = "Source";
    divProp[IMAGE]["source"]["Type"] = "Text";
    divProp[IMAGE]["source"]["IsStyle"] = true;

    divProp[IMAGE]["center"] = {};
    divProp[IMAGE]["center"]["Name"] = "center";
    divProp[IMAGE]["center"]["Caption"] = "Center";
    divProp[IMAGE]["center"]["Type"] = "Text";
    divProp[IMAGE]["center"]["IsStyle"] = false;

    /////////////////////////////////////////////////////////////////////////////
    divProp[GRID] = {};

    divProp[GRID]["ID"] = {};
    divProp[GRID]["ID"]["Name"] = "id";
    divProp[GRID]["ID"]["Caption"] = "ID";
    divProp[GRID]["ID"]["Type"] = "Text";
    divProp[GRID]["ID"]["IsStyle"] = false;

    divProp[GRID]["type"] = {};
    divProp[GRID]["type"]["Name"] = "type";
    divProp[GRID]["type"]["Caption"] = "Type";
    divProp[GRID]["type"]["Type"] = "Text";
    divProp[GRID]["type"]["IsStyle"] = false;

    divProp[GRID]["left"] = {};
    divProp[GRID]["left"]["Name"] = "left";
    divProp[GRID]["left"]["Caption"] = "Left";
    divProp[GRID]["left"]["Type"] = "Text";
    divProp[GRID]["left"]["IsStyle"] = true;
    divProp[GRID]["left"]["StyleUnit"] = 'px';

    divProp[GRID]["top"] = {};
    divProp[GRID]["top"]["Name"] = "top";
    divProp[GRID]["top"]["Caption"] = "Top";
    divProp[GRID]["top"]["Type"] = "Text";
    divProp[GRID]["top"]["IsStyle"] = true;
    divProp[GRID]["top"]["StyleUnit"] = 'px';

    divProp[GRID]["height"] = {};
    divProp[GRID]["height"]["Name"] = "height";
    divProp[GRID]["height"]["Caption"] = "Height";
    divProp[GRID]["height"]["Type"] = "Text";
    divProp[GRID]["height"]["IsStyle"] = true;
    divProp[GRID]["height"]["StyleUnit"] = 'px';

    divProp[GRID]["width"] = {};
    divProp[GRID]["width"]["Name"] = "width";
    divProp[GRID]["width"]["Caption"] = "Width";
    divProp[GRID]["width"]["Type"] = "Text";
    divProp[GRID]["width"]["IsStyle"] = true;
    divProp[GRID]["width"]["StyleUnit"] = 'px';

    /////////////////////////////////////////////////////////////////////////////
    divProp[MENU] = {};

    divProp[MENU]["ID"] = {};
    divProp[MENU]["ID"]["Name"] = "id";
    divProp[MENU]["ID"]["Caption"] = "ID";
    divProp[MENU]["ID"]["Type"] = "Text";
    divProp[MENU]["ID"]["IsStyle"] = false;

    divProp[MENU]["type"] = {};
    divProp[MENU]["type"]["Name"] = "type";
    divProp[MENU]["type"]["Caption"] = "Type";
    divProp[MENU]["type"]["Type"] = "Text";
    divProp[MENU]["type"]["IsStyle"] = false;

    divProp[MENU]["left"] = {};
    divProp[MENU]["left"]["Name"] = "left";
    divProp[MENU]["left"]["Caption"] = "Left";
    divProp[MENU]["left"]["Type"] = "Text";
    divProp[MENU]["left"]["IsStyle"] = true;
    divProp[MENU]["left"]["StyleUnit"] = 'px';

    divProp[MENU]["top"] = {};
    divProp[MENU]["top"]["Name"] = "top";
    divProp[MENU]["top"]["Caption"] = "Top";
    divProp[MENU]["top"]["Type"] = "Text";
    divProp[MENU]["top"]["IsStyle"] = true;
    divProp[MENU]["top"]["StyleUnit"] = 'px';

    divProp[MENU]["height"] = {};
    divProp[MENU]["height"]["Name"] = "height";
    divProp[MENU]["height"]["Caption"] = "Height";
    divProp[MENU]["height"]["Type"] = "Text";
    divProp[MENU]["height"]["IsStyle"] = true;
    divProp[MENU]["height"]["StyleUnit"] = 'px';

    divProp[MENU]["width"] = {};
    divProp[MENU]["width"]["Name"] = "width";
    divProp[MENU]["width"]["Caption"] = "Width";
    divProp[MENU]["width"]["Type"] = "Text";
    divProp[MENU]["width"]["IsStyle"] = true;
    divProp[MENU]["width"]["StyleUnit"] = 'px';

    divProp[MENU]["items"] = {};
    divProp[MENU]["items"]["Name"] = "items";
    divProp[MENU]["items"]["Caption"] = "Items";
    divProp[MENU]["items"]["Type"] = "Text";
    divProp[MENU]["items"]["IsStyle"] = false;
    /////////////////////////////////////////////////////////////////////////////
    divProp[INPUT] = {};

    divProp[INPUT]["ID"] = {};
    divProp[INPUT]["ID"]["Name"] = "id";
    divProp[INPUT]["ID"]["Caption"] = "ID";
    divProp[INPUT]["ID"]["Type"] = "Text";
    divProp[INPUT]["ID"]["IsStyle"] = false;

    divProp[INPUT]["type"] = {};
    divProp[INPUT]["type"]["Name"] = "dashboardItemType";
    divProp[INPUT]["type"]["Caption"] = "Type";
    divProp[INPUT]["type"]["Type"] = "Text";
    divProp[INPUT]["type"]["IsStyle"] = false;

    divProp[INPUT]["left"] = {};
    divProp[INPUT]["left"]["Name"] = "left";
    divProp[INPUT]["left"]["Caption"] = "Left";
    divProp[INPUT]["left"]["Type"] = "Text";
    divProp[INPUT]["left"]["IsStyle"] = true;
    divProp[INPUT]["left"]["StyleUnit"] = 'px';

    divProp[INPUT]["top"] = {};
    divProp[INPUT]["top"]["Name"] = "top";
    divProp[INPUT]["top"]["Caption"] = "Top";
    divProp[INPUT]["top"]["Type"] = "Text";
    divProp[INPUT]["top"]["IsStyle"] = true;
    divProp[INPUT]["top"]["StyleUnit"] = 'px';

    divProp[INPUT]["height"] = {};
    divProp[INPUT]["height"]["Name"] = "height";
    divProp[INPUT]["height"]["Caption"] = "Height";
    divProp[INPUT]["height"]["Type"] = "Text";
    divProp[INPUT]["height"]["IsStyle"] = true;
    divProp[INPUT]["height"]["StyleUnit"] = 'px';

    divProp[INPUT]["width"] = {};
    divProp[INPUT]["width"]["Name"] = "width";
    divProp[INPUT]["width"]["Caption"] = "Width";
    divProp[INPUT]["width"]["Type"] = "Text";
    divProp[INPUT]["width"]["IsStyle"] = true;
    divProp[INPUT]["width"]["StyleUnit"] = 'px';

    divProp[INPUT]["fontSize"] = {};
    divProp[INPUT]["fontSize"]["Name"] = "fontSize";
    divProp[INPUT]["fontSize"]["Caption"] = "Font Size";
    divProp[INPUT]["fontSize"]["Type"] = "Text";
    divProp[INPUT]["fontSize"]["IsStyle"] = true;
    divProp[INPUT]["fontSize"]["StyleUnit"] = 'px';
    divProp[INPUT]["fontSize"]["OnChange"] = "println('font size has changed')";

    divProp[INPUT]["fontWeight"] = {};
    divProp[INPUT]["fontWeight"]["Name"] = "fontWrigth";
    divProp[INPUT]["fontWeight"]["Caption"] = "Font Weight";
    divProp[INPUT]["fontWeight"]["Type"] = "Text";
    divProp[INPUT]["fontWeight"]["IsStyle"] = true;
    divProp[INPUT]["fontWeight"]["StyleUnit"] = 'px';
    divProp[INPUT]["fontWeight"]["OnChange"] = "println('font weight has changed')";

    divProp[INPUT]["color"] = {};
    divProp[INPUT]["color"]["Name"] = "color";
    divProp[INPUT]["color"]["Caption"] = "Color";
    divProp[INPUT]["color"]["Type"] = "Text";
    divProp[INPUT]["color"]["IsStyle"] = true;

    divProp[INPUT]["background-color"] = {};
    divProp[INPUT]["background-color"]["Name"] = "background-color";
    divProp[INPUT]["background-color"]["Caption"] = "Background";
    divProp[INPUT]["background-color"]["Type"] = "Text";
    divProp[INPUT]["background-color"]["IsStyle"] = true;
    /////////////////////////////////////////////////////////////////////////////
    divProp[BUTTON] = {};

    divProp[BUTTON]["ID"] = {};
    divProp[BUTTON]["ID"]["Name"] = "id";
    divProp[BUTTON]["ID"]["Caption"] = "ID";
    divProp[BUTTON]["ID"]["Type"] = "Text";
    divProp[BUTTON]["ID"]["IsStyle"] = false;

    divProp[BUTTON]["type"] = {};
    divProp[BUTTON]["type"]["Name"] = "type";
    divProp[BUTTON]["type"]["Caption"] = "Type";
    divProp[BUTTON]["type"]["Type"] = "Text";
    divProp[BUTTON]["type"]["IsStyle"] = false;

    divProp[BUTTON]["left"] = {};
    divProp[BUTTON]["left"]["Name"] = "left";
    divProp[BUTTON]["left"]["Caption"] = "Left";
    divProp[BUTTON]["left"]["Type"] = "Text";
    divProp[BUTTON]["left"]["IsStyle"] = true;
    divProp[BUTTON]["left"]["StyleUnit"] = 'px';

    divProp[BUTTON]["top"] = {};
    divProp[BUTTON]["top"]["Name"] = "top";
    divProp[BUTTON]["top"]["Caption"] = "Top";
    divProp[BUTTON]["top"]["Type"] = "Text";
    divProp[BUTTON]["top"]["IsStyle"] = true;
    divProp[BUTTON]["top"]["StyleUnit"] = 'px';

    divProp[BUTTON]["height"] = {};
    divProp[BUTTON]["height"]["Name"] = "height";
    divProp[BUTTON]["height"]["Caption"] = "Height";
    divProp[BUTTON]["height"]["Type"] = "Text";
    divProp[BUTTON]["height"]["IsStyle"] = true;
    divProp[BUTTON]["height"]["StyleUnit"] = 'px';

    divProp[BUTTON]["width"] = {};
    divProp[BUTTON]["width"]["Name"] = "width";
    divProp[BUTTON]["width"]["Caption"] = "Width";
    divProp[BUTTON]["width"]["Type"] = "Text";
    divProp[BUTTON]["width"]["IsStyle"] = true;
    divProp[BUTTON]["width"]["StyleUnit"] = 'px';

    divProp[BUTTON]["text"] = {};
    divProp[BUTTON]["text"]["Name"] = "text";
    divProp[BUTTON]["text"]["Caption"] = "Text";
    divProp[BUTTON]["text"]["Type"] = "Text";
    divProp[BUTTON]["text"]["IsStyle"] = false;

    divProp[BUTTON]["font-size"] = {};
    divProp[BUTTON]["font-size"]["Name"] = "font-size";
    divProp[BUTTON]["font-size"]["Caption"] = "font-size";
    divProp[BUTTON]["font-size"]["Type"] = "Text";
    divProp[BUTTON]["font-size"]["IsStyle"] = true;
    divProp[BUTTON]["font-size"]["StyleUnit"] = 'px';
    divProp[BUTTON]["font-size"]["OnChange"] = "println('font size has changed')";

    divProp[BUTTON]["font-weight"] = {};
    divProp[BUTTON]["font-weight"]["Name"] = "font-weight";
    divProp[BUTTON]["font-weight"]["Caption"] = "font-weight";
    divProp[BUTTON]["font-weight"]["Type"] = "Text";
    divProp[BUTTON]["font-weight"]["IsStyle"] = true;
    divProp[BUTTON]["font-weight"]["StyleUnit"] = '';
    divProp[BUTTON]["font-weight"]["OnChange"] = "";

    //divProp[BUTTON]["text-align"] = {};
    //divProp[BUTTON]["text-align"]["Name"] = "text-align";
    //divProp[BUTTON]["text-align"]["Caption"] = "text-align";
    //divProp[BUTTON]["text-align"]["Type"] = "Text";
    //divProp[BUTTON]["text-align"]["IsStyle"] = true;
    //divProp[BUTTON]["text-align"]["StyleUnit"] = '';    
    //divProp[BUTTON]["text-align"]["OnChange"] = "";


    divProp[BUTTON]["color"] = {};
    divProp[BUTTON]["color"]["Name"] = "color";
    divProp[BUTTON]["color"]["Caption"] = "Color";
    divProp[BUTTON]["color"]["Type"] = "Text";
    divProp[BUTTON]["color"]["IsStyle"] = true;

    divProp[BUTTON]["background-color"] = {};
    divProp[BUTTON]["background-color"]["Name"] = "background-color";
    divProp[BUTTON]["background-color"]["Caption"] = "Background";
    divProp[BUTTON]["background-color"]["Type"] = "Text";
    divProp[BUTTON]["background-color"]["IsStyle"] = true;

    createMenu();
    $("#topNav").find("li").each(function () {
        if ($(this).find("ul").length > 0) {
            //$("<span>").text("^").appendTo($(this).children(":first"));

            //show subnav on hover
            $(this).hover(function () {
                //$(this).find("ul").stop(true, true).css("display", "block");
                $(this).find("ul").css("display", "block");
            });

            //hide submenus on exit
            $(this).mouseleave(function () {
                //$(this).find("ul").stop(true, true).css("display", "none");//slideUp();
                $(this).find("ul").css("display", "none");//slideUp();
            });
        }
    });
    
    onLoad();
    
    $("#newProjectDialog-apply").click(function () {
        var name = $("#newProjectName").val();
        createProject(name);
        $('#newProjectDialog').hide();
        $("#blackGlass").hide();
        $("#mainPage").show();        
    }); 

    $("#newProjectDialog-cancel").click(function () {
        $('#newProjectDialog').hide();
        $("#blackGlass").hide();
        $("#mainPage").show();
    }); 

    $(".sel-layout").mouseover(function() {
        $(this).css("border", "2px solid lightgray");
    });
    
    $(".sel-layout").mouseleave(function() {
        $(this).css("border", "1px solid lightgray");
    });
    
    $(".sel-layout").click(function() {
        $("#newProjectDialog-apply").click();
    });

});