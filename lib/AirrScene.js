import React from 'react';
import PropTypes from 'prop-types';
import AirrComponent from './AirrComponent';
import AirrFX from './AirrFX';
import AirrMayer from './AirrMayer';
import update from 'immutability-helper';

export default class AirrScene extends AirrComponent {

    viewsCompsRefs = {};
    containerDOM = null;
    navbarDOM = null;
    mayersCompsRefs = {};
    sidepanelComp = null;

    constructor(props) {
        super(props);

        const views = this.prepareViews(props.views);

        if (props.sidepanel) {
            props.sidepanel.props.ref = comp => this.sidepanelComp = comp;
            if (typeof props.sidepanel.props.enabled === 'undefined') {
                props.sidepanel.props.enabled = true; //force explicit value, e.g needed when checking if panel is enabled in `openMayer` method
            }
        }

        this.state = {
            active: props.active,
            navbar: props.navbar,
            navbarHeight: props.navbarHeight,
            backButton: props.backButton,
            backButtonOnFirstView: props.backButtonOnFirstView,
            width: props.width,
            height: props.height,
            activeViewName: props.activeViewName,
            animation: props.animation,
            views: views,
            sidepanel: props.sidepanel,
            GUIDisabled: props.GUIDisabled,
            mayers: props.mayers
        };
    }

    /**
     * Takes array of views and assign react specific properties (key and ref) to each view configuartion
     * 
     * @param {array} views
     * @returns {void}
     */
    prepareViews(views) {
        return views.map((item) => {
            item.props.key = item.props.name;
            item.props.ref = (comp) => this.viewsCompsRefs[item.props.name] = comp;
            return item;
        });
    }

    /**
     * 
     * @param {string} animation
     * @returns {void}
     */
    updateAnimation(animation) {
        this.setState({animation: animation});
    }

    /**
     * Updates Scenes state by updating every view configurion using immutability-helper::update function
     * 
     * @param {object} updateDefinition Object specifing update operation that will be applied on every view configuraion 
     * @returns {void}
     */
    updateViews(updateDefinition) {
        const newviewsdefinition = this.state.views.map((item) => {
            return update(item, updateDefinition);
        });

        this.setState({views: newviewsdefinition});
    }

    componentWillReceiveProps(nextProps) {

        if (this.state.views.length !== nextProps.views.length) { //Is views array different in length ?

            if (this.state.activeViewName !== nextProps.activeViewName) {
                if (this.state.views.length > nextProps.views.length) { //Views POP operation
                    const oldActiveViewName = this.state.activeViewName;
                    this.changeActiveView(nextProps.activeViewName, () => {
                        this.setState({views: this.prepareViews(nextProps.views)});
                        delete this.viewsCompsRefs[oldActiveViewName];
                    });
                } else { //Views PUSH operation
                    this.setState({views: this.prepareViews(nextProps.views)}, () => this.changeActiveView(nextProps.activeViewName));
                }
            } else {
                this.setState({views: this.prepareViews(nextProps.views)});
            }
        } else { //else check if every view configuration is the same
            let equal = true;
            this.state.views.forEach((item, i) => {
                if (item !== nextProps.views[i]) {
                    equal = false; //NOT equal!
                    return;
                }
            });

            if (!equal) { //update views state
                this.setState({views: this.prepareViews(nextProps.views)}, () => {
                    if (this.state.activeViewName !== nextProps.activeViewName) { //now we can check if active view has changed
                        this.changeActiveView(nextProps.activeViewName);
                    }
                });
            } else if (this.state.activeViewName !== nextProps.activeViewName) { ///if only active view has changed
                this.changeActiveView(nextProps.activeViewName);
            }
        }

        if (this.state.mayers.length !== nextProps.mayers.length) { //Is mayer array different in length ?
            if (this.state.mayers.length > nextProps.mayers.length) { //close mayer
                //find missing mayer name
                let missingMayerName = '';
                this.state.mayers.forEach((mayer) => {
                    let found = false;
                    nextProps.mayers.forEach((mayer2) => {
                        if (mayer.name === mayer2.name) {
                            found = true;
                        }
                    });

                    if (!found) {
                        missingMayerName = mayer.name;
                    }
                });

                if (missingMayerName) {
                    this.closeMayer(missingMayerName);
                }
            } else { //add new mayer, it will open automatically by componentDidMount mechanism
                this.openMayer(nextProps.mayers[nextProps.mayers.length - 1]);
            }
        } else { //else check if every mayer configuration is the same
            let equal = true;
            this.state.mayers.forEach((item, i) => {
                if (item !== nextProps.mayers[i]) {
                    equal = false;
                    return;
                }
            });

            if (!equal) { //NOT same, update mayers state
                this.setState({mayers: nextProps.mayers});
            }
        }

        //SIMPLE STATE UPDATES OPERATIONS:
        if (this.state.active !== nextProps.active) {
            this.setState({active: nextProps.active});
        }
        if (this.state.animation !== nextProps.animation) {
            this.setState({animation: nextProps.animation});
        }
        if (this.state.sidepanel !== nextProps.sidepanel) {
            this.setState({sidepanel: nextProps.sidepanel});
        }
        if (this.state.navbar !== nextProps.navbar) {
            this.setState({navbar: nextProps.navbar});
        }
        if (this.state.navbarHeight !== nextProps.navbarHeight) {
            this.setState({navbarHeight: nextProps.navbarHeight});
        }
        if (this.state.backButton !== nextProps.backButton) {
            this.setState({backButton: nextProps.backButton});
        }
        if (this.state.backButtonOnFirstView !== nextProps.backButtonOnFirstView) {
            this.setState({backButtonOnFirstView: nextProps.backButtonOnFirstView});
        }
        if (this.state.width !== nextProps.width) {
            this.setState({width: nextProps.width});
        }
        if (this.state.height !== nextProps.height) {
            this.setState({height: nextProps.height});
        }
        if (this.state.GUIDisabled !== nextProps.GUIDisabled) {
            this.setState({GUIDisabled: nextProps.GUIDisabled});
        }
    }

    /**
     * Returns view index in this.state.views array
     * 
     * @param {string} viewName
     * @returns {Number}
     */
    getViewIndex(viewName) {
        let index = -1;

        this.state.views.forEach((config, i) => {
            if (config.props.name === viewName) {
                index = i;
            }
        });

        return index;
    }

    /**
     * Pops view out of this.state.views array, firstly requesting views animation
     * 
     * @returns {void}
     */
    popView() {
        const index = this.getViewIndex(this.state.activeViewName);

        if (index >= 1) {
            const prevIndex = index - 1;
            const prevViewName = this.state.views[prevIndex].props.name;
            const oldViewName = this.state.activeViewName;
            const newviewdefinition = update(this.state.views, {$splice: [[index, 1]]});

            this.changeActiveView(prevViewName, () => {
                if (oldViewName in this.viewsCompsRefs) {
                    delete this.viewsCompsRefs[oldViewName];
                }
                this.setState({
                    views: newviewdefinition
                });
            });
        } else {
            console.warn('[Airr] Can`t pop view. Only one view in stack.');
        }
    }

    /**
     * Pushes new view config into this.state.views array. This operation will invoke views animation if one is specified
     * 
     * @param {object} config new view configuration object
     * @returns {void}
     */
    pushView(config) {
        config.props.key = config.props.name;
        config.props.ref = (comp) => this.viewsCompsRefs[config.props.name] = comp;

        const newviewdefinition = update(this.state.views, {$push: [config]});

        this.setState({views: newviewdefinition}, () => {
            this.changeActiveView(config.props.name);
        });
    }

    /**
     * If config has buttons that contains logical true `close` property, 
     * this method will attach close mayer functionality to tap event on this button.
     * 
     * @param {object} config mayer config object
     * @returns {void}
     */
    prepareMayerConfig(config) {
        if (config.buttons.length) {
            config.buttons.forEach(item => {
                if (item.close) {
                    if (item.handler) {
                        const oldHandler = item.handler;
                        item.handler = (e) => {
                            oldHandler(e);
                            this.closeMayer(config.name);
                        };
                    } else {
                        item.handler = (e) => {
                            this.closeMayer(config.name);
                        };
                    }
                }
            });
        }
    }

    /**
     * Add new mayer to this.state.mayers configurations array which will immediatelly open new mayer due to its nature
     * 
     * @param {object} config
     * @returns {void}
     */
    openMayer(config) {
        let cancel = false;
        this.state.mayers.forEach(item => {
            if (item.name === config.name) {
                console.warn('[Airr] Scene allready has Mayer with this name: ' + item.name);
                cancel = true;
            }
        });

        //cancel if mayer name is repeated
        if (cancel) {
            return;
        }

        //if scene has sidepanel - disable it
        if (this.state.sidepanel && this.state.sidepanel.props.enabled) {
            this.disableSidepanel();
        }

        //add special functionality
        this.prepareMayerConfig(config);

        const newMayersDefinition = update(this.state.mayers, {$push: [config]});
        this.setState({mayers: newMayersDefinition});
    }

    /**
     * Close mayer by name
     * 
     * @param {string} name
     * @returns {void}
     */
    closeMayer(name) {
        let mayerConfigIndex = -1;

        this.state.mayers.forEach((config, i) => {
            if (config.name === name) {
                mayerConfigIndex = i;
            }
        });

        if (mayerConfigIndex >= 0 && this.mayersCompsRefs[name]) {
            this.mayersCompsRefs[name].animateOut(() => {
                const newMayerDefinition = update(this.state.mayers, {$splice: [[mayerConfigIndex, 1]]});
                delete this.mayersCompsRefs[name];
                this.setState({mayers: newMayerDefinition});

                if (this.state.sidepanel) {
                    let hasMayerLeft = false;
                    const children = [...this.refs.dom.children];
                    children.forEach((item) => {
                        if (item.classList.contains('airr-mayer')) {
                            hasMayerLeft = true;
                        }
                    });

                    if (!hasMayerLeft) {
                        this.enableSidepanel();
                    }
                }
            });
        }


    }

    /**
     * Close every mayer by resetting this.state.mayers to empty array value
     * 
     * @returns {void}
     */
    closeALlMayers() {
        if (this.state.mayers.length) {
            this.setState({mayers: []});
        }

        if (this.state.sidepanel && !this.state.sidepanel.props.enabled) {
            this.enableSidepanel();
        }

        this.mayersCompsRefs = {};
    }

    /**
     * Changes scenes active view
     * 
     * @param {string} newViewName
     * @param {function} callback
     * @returns {void}
     */
    changeActiveView(newViewName, callback) {
        if (typeof newViewName === 'string') {

            this.setState({GUIDisabled: true}, () => {

                if (newViewName === this.state.activeViewName) {
                    console.warn('[Airr] This View is already active.');
                    this.setState({GUIDisabled: false});
                    return;
                }

                let found = false;

                this.state.views.forEach((view) => {
                    if (view.props.name === newViewName) {
                        found = true;
                    }
                });

                if (!found) {
                    console.warn('[Airr] View with name ' + newViewName + ' is not presence in this Scene.');
                } else {
                    const oldViewName = this.state.activeViewName;
                    const newViewComp = this.viewsCompsRefs[newViewName];
                    const oldViewComp = this.viewsCompsRefs[oldViewName];

                    if (typeof newViewComp.viewBeforeActivation === 'function') {
                        newViewComp.viewBeforeActivation();
                    }

                    if (typeof oldViewComp.viewBeforeDeactivation === 'function') {
                        oldViewComp.viewBeforeDeactivation();
                    }

                    if (this.state.animation) {

                        this.doViewAnimation(newViewName, oldViewName, () => {
                            this.setState({
                                activeViewName: newViewName,
                                GUIDisabled: false
                            }, () => {
                                if (typeof newViewComp.viewAfterActivation === 'function') {
                                    newViewComp.viewAfterActivation();
                                }
                                if (typeof oldViewComp.viewAfterDeactivation === 'function') {
                                    oldViewComp.viewAfterDeactivation();
                                }

                                if (typeof callback === 'function') {
                                    callback();
                                }
                            });
                        });
                    } else {
                        this.setState({
                            activeViewName: newViewName,
                            GUIDisabled: false
                        }, () => {
                            if (typeof newViewComp.viewAfterActivation === 'function') {
                                newViewComp.viewAfterActivation();
                            }
                            if (typeof oldViewComp.viewAfterDeactivation === 'function') {
                                oldViewComp.viewAfterDeactivation();
                            }

                            if (typeof callback === 'function') {
                                callback();
                            }
                        });
                    }
                }
            });

        } else {
            console.warn('[Airr] You must specify view name property as string value');
        }
    }

    /**
     * Perform animation between old and new active view
     * 
     * @param {string} newViewName
     * @param {string} oldViewName
     * @param {function} callback
     * @returns {void}
     */
    doViewAnimation(newViewName, oldViewName, callback) {
        const newViewDOM = this.viewsCompsRefs[newViewName].refs.airrView.refs.dom;
        const oldViewIndex = this.getViewIndex(oldViewName);
        const newViewIndex = this.getViewIndex(newViewName);

        const direction = newViewIndex > oldViewIndex ? 1 : -1;

        if (this.state.navbar) { //perform navbar animations
            const newTitle = document.createElement('div');
            const textSpan = document.createElement('span');
            const oldTitle = this.navbarDOM.querySelector('.title');
            newTitle.classList.add('new-title');
            textSpan.textContent = this.state.views[this.getViewIndex(newViewName)].props.title;
            newTitle.appendChild(textSpan);

            this.navbarDOM.insertBefore(newTitle, this.navbarDOM.children[0]);

            if (this.state.backButton && this.props.stackMode) {
                const backDOM = this.navbarDOM.querySelector('.back');
                if (oldViewIndex === 0) {

                   AirrFX.doTransitionAnimation(backDOM, {
                        webkitTransform: 'translate3d(100%,0,0)',
                        transform: 'translate3d(100%,0,0)',
                        opacity: 0
                    }, [`opacity ${this.props.animationTime}ms ease-out`, `transform ${this.props.animationTime}ms ease-out`], {
                        webkitTransform: 'translate3d(0,0,0)',
                        transform: 'translate3d(0,0,0)',
                        opacity: 1
                    }, () => backDOM.classList.remove('hidden'), this.props.animationTime);

                } else if (newViewIndex === 0) {

                    AirrFX.doTransitionAnimation(backDOM, {
                        webkitTransform: 'translate3d(0,0,0)',
                        transform: 'translate3d(0,0,0)',
                        opacity: 1
                    }, [`opacity ${this.props.animationTime}ms ease-out`, `transform ${this.props.animationTime}ms ease-out`], {
                        webkitTransform: 'translate3d(-100%,0,0)',
                        transform: 'translate3d(-100%,0,0)',
                        opacity: 0
                    }, null, this.props.animationTime);

                }
            }


            AirrFX.doTransitionAnimation(oldTitle, {
                webkitTransform: 'translate3d(0,0,0)',
                transform: 'translate3d(0,0,0)',
                opacity: 1
            }, [`opacity ${this.props.animationTime}ms ease-out`, `transform ${this.props.animationTime}ms ease-out`], {
                webkitTransform: `translate3d(${oldTitle.clientWidth * direction * -1 + 'px'},0,0)`,
                transform: `translate3d(${oldTitle.clientWidth * direction * -1 + 'px'},0,0)`,
                opacity: 0
            }, null, this.props.animationTime);

            AirrFX.doTransitionAnimation(newTitle, {
                webkitTransform: `translate3d(${(oldTitle.clientWidth / 2 + textSpan.clientWidth / 2) * direction + 'px'},0,0)`,
                transform: `translate3d(${(oldTitle.clientWidth / 2 + textSpan.clientWidth / 2) * direction + 'px'},0,0)`,
                opacity: 0
            }, [`opacity ${this.props.animationTime}ms ease-out`, `transform ${this.props.animationTime}ms ease-out`], {
                webkitTransform: `translate3d(0,0,0)`,
                transform: `translate3d(0,0,0)`,
                opacity: 1
            }, null, this.props.animationTime);

            setTimeout(() => {
                newTitle.classList.remove('new-title');
                newTitle.classList.add('title');
                this.navbarDOM.removeChild(oldTitle);
            }, this.props.animationTime);
        }

        if (this.state.animation === 'slide') {
            newViewDOM.style.display = 'block';
            var startProps = {};
            var endProps = {};

            if (direction === -1) {
                startProps.webkitTransform = 'translate3d(' + (-1 * this.refs.dom.clientWidth) + 'px,0,0)';
                startProps.transform = 'translate3d(' + (-1 * this.refs.dom.clientWidth) + 'px,0,0)';
                endProps.webkitTransform = 'translate3d(0,0,0)';
                endProps.transform = 'translate3d(0,0,0)';
            } else {
                endProps.webkitTransform = 'translate3d(' + (-1 * this.refs.dom.clientWidth) + 'px,0,0)';
                endProps.transform = 'translate3d(' + (-1 * this.refs.dom.clientWidth) + 'px,0,0)';
            }

            AirrFX.doTransitionAnimation(this.containerDOM, startProps, [`transform ${this.props.animationTime}ms ease-out`], endProps, null, this.props.animationTime, () => {
                newViewDOM.style.display = '';
                this.containerDOM.style.webkitTransform = 'translate3d(0,0,0)';
                this.containerDOM.style.transform = 'translate3d(0,0,0)';
                this.containerDOM.style.webkitTransition = '';
                this.containerDOM.style.transition = '';
                this.containerDOM.style.transition = '';
                this.containerDOM.style.webkitBackfaceVisibility = '';
                this.containerDOM.style.backfaceVisibility = '';

                if (typeof callback === 'function') {
                    callback();
                }
            });
        } else if (this.state.animation === 'overlay') {
            if (direction === 1) {
                AirrFX.doTransitionAnimation(newViewDOM, {
                    webkitTransform: `translate3d(${this.containerDOM.clientWidth + 'px'},0,0)`,
                    transform: `translate3d(${this.containerDOM.clientWidth + 'px'},0,0)`,
                    opacity: 0
                }, [`opacity ${this.props.animationTime}ms ease-out`, `transform ${this.props.animationTime}ms ease-out`], {
                    webkitTransform: `translate3d(0,0,0)`,
                    transform: `translate3d(0,0,0)`,
                    opacity: 1
                }, () => newViewDOM.style.zIndex = 102, this.props.animationTime, () => {
                    newViewDOM.style.zIndex = '';
                    callback();
                });

            } else {
                if (this.props.stackMode) {
                    AirrFX.doTransitionAnimation(this.viewsCompsRefs[oldViewName].refs.airrView.refs.dom, {
                        webkitTransform: `translate3d(0,0,0)`,
                        transform: `translate3d(0,0,0)`,
                        opacity: 1
                    }, [`opacity ${this.props.animationTime}ms ease-out`, `transform ${this.props.animationTime}ms ease-out`], {
                        webkitTransform: `translate3d(0,${this.containerDOM.clientHeight / 4 + 'px'},0)`,
                        transform: `translate3d(0,${this.containerDOM.clientHeight / 4 + 'px'},0)`,
                        opacity: 0
                    }, null, this.props.animationTime, callback);
                } else {
                    AirrFX.doTransitionAnimation(newViewDOM, {
                        webkitTransform: `translate3d(${(-1 * this.containerDOM.clientWidth) + 'px'},0,0)`,
                        transform: `translate3d(${(-1 * this.containerDOM.clientWidth) + 'px'},0,0)`,
                        opacity: 0
                    }, [`opacity ${this.props.animationTime}ms ease-out`, `transform ${this.props.animationTime}ms ease-out`], {
                        webkitTransform: `translate3d(0,0,0)`,
                        transform: `translate3d(0,0,0)`,
                        opacity: 1
                    }, () => newViewDOM.style.zIndex = 102, this.props.animationTime, () => {
                        newViewDOM.style.zIndex = '';
                        callback();
                    });
                }
            }
        } else if (this.state.animation === 'fade') {
            AirrFX.doTransitionAnimation(newViewDOM, {
                opacity: 0
            }, [`opacity ${this.props.animationTime}ms ease-out`], {
                opacity: 1
            }, () => newViewDOM.style.zIndex = 102, this.props.animationTime, () => {
                newViewDOM.style.zIndex = '';
                callback();
            });
        }
    }

    /**
     * Enables scenes GUI by removing blank-mask class div element
     * 
     * @returns {void}
     */
    enableGUI() {
        this.setState({GUIDisabled: false});
    }

    /**
     * Disables scenes GUI by adding blank-mask class div element
     * 
     * @returns {undefined}
     */
    disableGUI() {
        this.setState({GUIDisabled: true});
    }

    /**
     * Makes sidepanel draggable
     * 
     * @returns {void}
     */
    enableSidepanel() {
        if (this.state.sidepanel) {
            const newPanelDefinition = update(this.state.sidepanel, {props: {enabled: {$set: true}}});
            this.setState({sidepanel: newPanelDefinition});
        }
    }

    /**
     * Disables sidepanel from being dragged
     * 
     * @returns {void}
     */
    disableSidepanel() {
        if (this.state.sidepanel) {
            const newPanelDefinition = update(this.state.sidepanel, {props: {enabled: {$set: false}}});
            this.setState({sidepanel: newPanelDefinition});
        }
    }

    /**
     * Updates sidepanels state configuration
     * 
     * @param {object} sidepanel
     * @returns {void}
     */
    updateSidepanel(sidepanel) {
        this.setState({
            sidepanel: sidepanel
        });
    }

    /**
     * Handles navbar backbutton tap events
     * 
     * @param {object} e Event object
     * @returns {void}
     */
    handleBackButton(e) {
        const backBtn = e.currentTarget;
        backBtn.classList.add('clicked');

        setTimeout(() => {
            backBtn.classList.remove('clicked');
        }, 300);

        if (this.props.stackMode && this.state.views.length > 1) {
            if (this.props.handleBackButton) {
                this.props.handleBackButton(e);
            } else {
                this.popView();
            }

        } else if (this.props.handleBackBehaviourOnFirstView) {
            this.props.handleBackBehaviourOnFirstView();
        }
    }

    /**
     * Handles navbar menu button tap events
     * 
     * @param {object} e Event object
     * @returns {void}
     */
    handleMenuButton(e) {
        if (this.sidepanelComp) {
            this.sidepanelComp.isShown() ? this.sidepanelComp.hide() : this.sidepanelComp.show();
        }
    }

    render() {
        const containerClassList = ['airr-container'];
        if (this.state.animation) {
            containerClassList.push(this.state.animation + '-animation');
        }

        let className = 'airr-view airr-scene';
        this.state.active && (className += ' active');

        let views = [];
        let isAnyViewActive = false;
        this.state.views.forEach((item) => {
            let viewProps = {};
            Object.assign(viewProps, item.props);

            viewProps.width = this.state.width;
            viewProps.height = this.state.navbar ? (parseFloat(this.state.height) - this.state.navbarHeight) : this.state.height;

            if (viewProps.name === this.state.activeViewName) {
                viewProps.active = true;
                isAnyViewActive = true;
            }

            views.push(React.createElement(item.type, viewProps));
        });

        if (!isAnyViewActive) {
            console.warn('[Airr] No view was set as active' + (this.props.name && (' in Scene named `' + this.props.name)) + '`.');
        }

        let containerStyle = {};
        if (this.state.animation === 'slide') {
            containerStyle = {width: this.state.width ? this.state.width * 2 + 'px' : parseFloat(this.state.width) * 2 + 'px'};
        }

        let sidepanel = null;
        if (this.state.sidepanel) {
            sidepanel = React.createElement(this.state.sidepanel.type, this.state.sidepanel.props);
        }


        let blankmask = null;
        if (this.state.GUIDisabled) {
            blankmask = <div className="airr-blank-mask"/>;
        }

        let mayers = [];
        if (this.state.mayers.length) {
            mayers = this.state.mayers.map((mayerProps) => {
                mayerProps.key = mayerProps.name;
                mayerProps.ref = (component) => this.mayersCompsRefs[mayerProps.name] = component;
                return React.createElement(AirrMayer, mayerProps);
            });
        }

        let navbar = null;
        if (this.state.navbar) {
            let back = null;
            if (this.state.backButton) {
                const backClassName = 'back ' + (this.getViewIndex(this.state.activeViewName) < 1 && !this.state.backButtonOnFirstView ? 'hidden' : '');
                back = <div className={backClassName} onClick={(e) => this.handleBackButton(e)}><div></div></div>;
            }
            const menu = this.state.sidepanel ? <div className="menu" onClick={(e) => this.handleMenuButton(e)}><div></div></div> : null;
            let title = null;
            views.forEach((v) => {
                if (v.props.name === this.state.activeViewName) {
                    title = v.props.title;
                }
            });
            navbar = (
                    <div className="airr-navbar" ref={dom => this.navbarDOM = dom} style={{height: this.state.navbarHeight + 'px'}}>
                        {back}
                        <div className="title"><span>{title}</span></div>
                        {menu}
                    </div>
                                );
                    }

            return (
                    <div className={className} 
                         style={{width: this.state.width + 'px', height: this.state.height + 'px'}} 
                         ref="dom">
                        {navbar}
                        <div className={containerClassList.join(' ')} style={containerStyle}
                             ref={div => this.containerDOM = div}>
                            {views}
                        </div>
                        {this.props.children}
                        {sidepanel}
                        {mayers}
                        {blankmask}
                    </div>
            );
    }
}


AirrScene.propTypes = {
    name: PropTypes.string.isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    activeViewName: PropTypes.string.isRequired,

    GUIDisabled: PropTypes.bool,
    animation: PropTypes.oneOf(['slide', 'overlay', 'fade']),
    animationTime: PropTypes.number,
    navbar: PropTypes.bool,
    navbarHeight: PropTypes.number,
    backButton: PropTypes.bool,
    backButtonOnFirstView: PropTypes.bool,
    handleBackButton: PropTypes.func,
    handleBackBehaviourOnFirstView: PropTypes.func,
    stackMode: PropTypes.bool,
    active: PropTypes.bool,
    /**
     * Sidepanels object must contain two properties.
     * 1. Type - being refference to class of which item will be instantiated
     * 2. Props - special properties of AirrSidepanel class. Go to class declaration for further properties documenation
     * 
     * Example:
     * {
     *    type: AirrSidepanel,
     *    props: {
     *        children: <div>sidepanel html content</div>,
     *        sceneWidth: window.innerWidth,
     *        sceneHeight: window.innerHeight,
     *        side: 'left',
     *        sizeFactor: 0.66
     *    }
     * }  
     **/
    sidepanel: PropTypes.object,

    /**
     * Objects of `views` array MUST contains two properties. 
     * 1. Type - being reffrence to class of which item will be instantiated. 
     * 2. Props - object that acts like components properties. 
     *    For special AirrView class properties go to its declaration to check out.             
     * 
     * Example:
     * this.state.views = [
     *      {
     *          type: AirrView,
     *          props: {
     *              name: 'Foobar',
     *              title: 'Foo is in the house',
     *              children: <div>This is Dave. Dave is div.</div>
     *              extraParam: bazHandler
     *          }          
     *      }
     * ]
     */
    views: PropTypes.arrayOf(PropTypes.object),

    /**
     * Objects of `mayers` array MUST contain special Mayer class properties.
     * For checkout of possible properties go to Mayer declaration.
     * 
     * Example:
     * this.mayers.views = [
     *   {
     *       name: 'demo-mayer',
     *       content: <div>Hello cruel world!</div>,
     *       appearFrom: 'left',
     *       leaveTo: 'right',
     *       avaibleHeight: this.props.height, //read from scenes properties
     *       buttons: [
     *           {
     *               content: 'Ok',
     *               handler: (e) => {
     *                   this.setState({mayers: []});
     *               }
     *           }
     *       ]
     *   }
     * ]
     */
    mayers: PropTypes.arrayOf(PropTypes.object),
    title: PropTypes.string
};
AirrScene.defaultProps = {
    name: '', //the name of the scene. Must be unique among others views in parent scene. Will be used as identification string
    width: null, //number
    height: null, //number
    activeViewName: null, //string 

    GUIDisabled: false, //bool
    animation: 'slide', //slide,overlay or fade
    animationTime: 300, //number time in miliseconds of views change animation, used also in navbar animations
    navbar: false, //bool
    navbarHeight: 48, //navbar height in px
    backButton: false, //bool
    backButtonOnFirstView: false, //bool To show backButton in navbar if currently showing first view in stack.
    handleBackButton: null, //parent function to handle back button tap
    handleBackBehaviourOnFirstView: null, //null or function e.g. if this scene is view in some parent scene, and you want to pop out of it - this function will come from parent scene and will handle this behaviour
    stackMode: true, //bool - if false Scene views will be assumed as tabs rather then stack order views. (view change vs. view pop/push)
    active: false, //bool is currently active in parent scene
    sidepanel: null, //{type: AirrSidepanel, props: {}}
    views: [], //array,
    mayers: [], //mayers conf list
    title: '' //titlebar name
};