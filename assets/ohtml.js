let GLOB_DATA = [];
let STATE_CLOCK = 100; // in milliseconds
let UPDATE_STATE = true; // if false, forces all states to update once and then remain static

const handleString = (input) => new Function('data', `
    return \`${input}\`
`);

const out = (severity, input) => {
    switch (severity) {
        case 0:
            console.log('[OHTML]: (Log) - ' + input);
            break;
        case 1:
            console.warn('[OHTML]: (Warn) - ' + input);
            break;
        case 2:
            console.error('[OHTML]: (Error) - ' + input);
            break;
        default:
            console.log('[OHTML] (Log) - ' + input);
            break;
    }
};

var parseOHTML = (frag, data, useNodes = true) => {

    const beginner = '%';
    GLOB_DATA = data;

    if (useNodes) {
        const iter = document.createNodeIterator(frag, NodeFilter.SHOW_TEXT, null);
        const nodes = {
          *[Symbol.iterator]() {
              const now = iter.nextNode();
              //let content = iter.nextElementSibling;
              yield now ? { next: now, done: false } : { done: true };
          }
        };
  
        for (node of nodes) {
           // console.log(node.next);
        }
    }  

    const modifierTypes = [
        'render',
        'class',
        'id',
        'set'
    ];

    const parseAttrModifier = (render) => {
        if (render != null) {
            if (render.includes(';')) {
                const attribs = render.split(';');
                for (let attr of attribs) {
                    // console.log(attr);
                }
            }

            for (const mod of modifierTypes) {
                if (render.includes(mod)) {

                    const args = [];
                    const modifierType = render.substring(0, render.indexOf('(')).trim();
                    const argString = render.substring(render.indexOf('(') + 1, render.indexOf(')')).trim();
    
                    if (argString.includes(',')) {
                        const argStrings = argString.split(',');
                        for (arg of argStrings) {
                            args.push(arg);
                        }
                    } else {
                        args.push(argString);
                    }

                    switch (modifierType) {
                        case "render":
                            if (args.length == 1) { //args only contains a single element
                                const element = "<" + args + " ohtml>%s</" + args + ">"
                                return element;
                            }
                            return null;
                        case "set": //TODO: implement
                            return null;
                        default:
                            return null;
                    }
                }
            }
        }
    };

    const buildState = (callback) => {
        const timer = setInterval(callback, STATE_CLOCK);
        if (!UPDATE_STATE) {
            callback();
            clearInterval(timer);
        }
    };

    const parseDataHolder = (html) => {
        if (html != null) {
            if (html.includes('$') && html.includes('{') && html.includes('}')) {
                return html.substring(html.indexOf('${') + 2, html.indexOf('}'));
            }
        }
    };

    let getElemAttrs = (elem) => {
        return [].slice.call(elem.attributes).map((attr) => {
            return {
                name: attr.name,
                value: attr.value
            }
        });
    };

    const bindToAttribute = (elem, binder) => {
        const boundTo = binder.split(':')[1];
        const attr = elem.getAttribute(beginner + binder);
        buildState(() => {
            if (GLOB_DATA[attr]) {
                elem.setAttribute(boundTo, GLOB_DATA[attr]);
                elem.removeAttribute(beginner + binder);
            } else {
                elem.removeAttribute(beginner + binder);
            }
        });
        return elem;
    };

  frag.querySelectorAll('*').forEach((elem) => {
    elem.getAttributeNames().forEach((name) => {

        if (name.startsWith(':')) { //string binding
            const attr = name.substring(1);
            if (GLOB_DATA[attr] != null) {
                if (elem instanceof HTMLInputElement) {
                    elem.addEventListener('keyup', (evt) => {
                        if (evt != null) {
                            GLOB_DATA[attr] = elem.value;
                        }
                    });
                } else {
                    out(2, "Could not bind to element that is not of type input");
                }
            }
            //elem.setAttribute(name.substring(1), handleString(elem.getAttribute(name))(data));
            //elem.removeAttribute(name);
            
        } else if (name.startsWith('@')) { //action binding

            elem.addEventListener(name.substring(1), GLOB_DATA[elem.getAttribute(name)]);
            elem.removeAttribute(name);

        } else if (name.startsWith('?')) { //conditional binding

            const attr = name.substring(1);
            if (GLOB_DATA[attr]) {
                elem.setAttribute(attr, '');
            }
            elem.removeAttribute(name);

        } else if (name.startsWith('%')) { //keyword binding

            const customForModifier = '->';
            const attr = name.substring(1).trim();

            if (attr.includes("bind:")) bindToAttribute(elem, attr);

            switch (attr) {
                case "set":
                    buildState(() => {
                        const setter = elem.getAttribute(beginner + 'set');
                        elem.innerHTML = GLOB_DATA[setter];
                    });
                    break;

                case "if":
                    const backupIf = [];
                    buildState(() => {
                        for (const data of backupIf) {
                            if (data.id == elem.getAttribute(beginner + 'if')) {
                                if (GLOB_DATA[elem.getAttribute(beginner + 'if')] && GLOB_DATA[elem.getAttribute(beginner + 'if')] != '') {
                                    elem.style = "display:;";
                                } else {
                                    elem.style = "display:none;";                                 
                                }
                            }
                        }
                    });

                    if (!GLOB_DATA[elem.getAttribute(beginner + 'if')] || GLOB_DATA[elem.getAttribute(beginner + 'if')] == '') {
                        backupIf.push({id: elem.getAttribute(beginner + 'if'), content: elem});
                        elem.style = "display:none;";
                    }
                    break;

                case "else":
                    if (elem.parentElement.hasAttribute(beginner + 'if')) {
                        // console.log(elem.parentElement);
                        // TODO: fix parent element hiding the else object from showing
                        elem.parentElement.childNodes.forEach((child) => {
                            if (child instanceof Element) {
                                if (child.hasAttribute(beginner + 'else')) {
                                    child.style = "display:none;";
                                } else {
                                    child.style = "display:;";
                                }
                            }
                        });
                    }
                    break;

                case "for":
                   const loop = elem.getAttribute(beginner + 'for');
                   if (loop != null) {
                        if (loop.includes(customForModifier)) {
                            let outputs = [];
                            let backupDom;

                            const elemData = elem.textContent.trim();

                            const validIterator = loop.split('->')[0].split('of')[0].trim();
                            const validArray = loop.split('->')[0].split('of')[1].trim();

                            const modifier = loop.split('->')[1];

                            const rawIterator = parseDataHolder(elemData);
                            const iteratorTxtVar = parseDataHolder(elemData).split('::')[0].trim(); 

                            const tag = parseAttrModifier(modifier);

                            let attrs = getElemAttrs(elem);

                            if (attrs[0] !== "ohtml") {
                                backupDom += elem.innerHTML.replace('${'+iteratorTxtVar+'}', '').replace('${'+rawIterator+'}', '');;
                                elem.textContent = "";
                            }


                            // TODO: fix this mess to allow for smooth traversal through an array
                            for (const iter of eval(validArray)) {
                                //console.log(iter + ' is of type: ' + typeof iter);
                                if (typeof iter === 'object') {
                                    if (rawIterator.includes('::')) {
                                        const retriever = rawIterator.split('::');
                                        for (const ret of retriever) {
                                            if (typeof iter[ret] === 'object') {
                                                for (const agRet of retriever) {
                                                    if (agRet in iter[ret]) {
                                                        //console.log(iter[ret][agRet]);
                                                        outputs.push(tag.replace('%s', iter[ret][agRet]));
                                                    }
                                                }
                                            } else {
                                                if (ret in iter) {
                                                    outputs.push(tag.replace('%s', iter[ret]));
                                                }
                                            }
                                        }
                                    } else {
                                        outputs.push(tag.replace('%s', iter));
                                    }
                                } else {
                                    outputs.push(tag.replace('%s', iter));
                                }
                            }

                            if (iteratorTxtVar == validIterator) {
                                elem.textContent = elem.textContent.replace('${'+iteratorTxtVar+'}', '').replace('${'+rawIterator+'}', '');
                                elem.innerHTML += backupDom.replace('undefined', '').trim();
                                for (let out of outputs) {
                                    elem.innerHTML += out;
                                }
                            } else {
                                elem.textContent = elem.textContent.replace('${'+iteratorTxtVar+'}', '').replace('${'+rawIterator+'}', '');
                                out(2, 'Iterator did not match the replacer in for loop!');
                            } 

                            
                            eval(validArray).push = function() {
                                
                                Array.prototype.push.apply(this, arguments);

                                for (let iter of eval(validArray)) {
                                    outputs = [];    
                                    outputs.push(tag.replace('%s', iter));
                                }

                                if (iteratorTxtVar == validIterator) {
                                    for (let out of outputs) {
                                        elem.innerHTML += out;
                                    }
                                } else {
                                    out(2, 'Iterator did not match the replacer in for loop!');
                                } 
                            };

                            eval(validArray).pop = function() {

                                Array.prototype.pop.apply(this, arguments);

                                /* 
                                    TODO: allow other elements to be inside of a for tag and ignore them when popping
                                */

                                elem.innerHTML = "";

                                for (let iter of eval(validArray)) {
                                    outputs = [];
                                    elem.innerHTML += tag.replace('%s', iter);
                                }
                            };
                            
                        }
                   }
                   break;

                case "while": //TODO: implement
                    break;
                case "switch": //TODO: implement
                    break;
                default:
                    break;
            }
        }
    });
  });
};

var StateManager = {
    getState: (stateVar) => {
        return GLOB_DATA[stateVar];
    },
    setState: (stateVar, value) => {
        GLOB_DATA[stateVar] = value;
    }
};


//TODO: finish template parsing
/*var tmpl = (id) => {
    const template = document.getElementById(id);
    return (data) => {
        const clone = template.content.cloneNode(true);
        parseOHTML(clone, data);
        return clone;
    };
};*/