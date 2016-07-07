define([
    'layout/masthead',
    'layout/panel',
    'mvc/ui/ui-modal',
    'mvc/base-mvc',
    "mvc/tool/tool-form"
], function( Masthead, Panel, Modal, BaseMVC, ToolForm ) {

// ============================================================================
var PageLayoutView = Backbone.View.extend( BaseMVC.LoggableMixin ).extend({
    _logNamespace : 'layout',

    el : 'body',
    className : 'full-content',
    events: {
        'keydown': "invokeSearchOverlay",
        'keyup .txtbx-search-data': "searchData",
        'click .remove-search-screen': "removeOverlay",
        'click .tool-search-link': "searchedToolLink",
        'click .history-search-link': "removeOverlay"
    },
    _panelIds : [
        'left', 'center', 'right'
    ],

    defaultOptions : {
        message_box_visible     : false,
        message_box_content     : '',
        message_box_class       : 'info',
        show_inactivity_warning : false,
        inactivity_box_content  : ''
    },

    initialize : function( options ) {
        // TODO: remove globals
        this.log( this + '.initialize:', options );
        _.extend( this, _.pick( options, this._panelIds ) );
        this.options = _.defaults( _.omit( options.config, this._panelIds ), this.defaultOptions );
        Galaxy.modal = this.modal = new Modal.View();
        this.masthead = new Masthead.View( this.options );
        this.$el.attr( 'scroll', 'no' );
        this.$el.html( this._template() );
        this.$el.append( this.masthead.frame.$el );
        this.$( '#masthead' ).replaceWith( this.masthead.$el );
        this.$el.append( this.modal.$el );
        this.$messagebox = this.$( '#messagebox' );
        this.$inactivebox = this.$( '#inactivebox' );
    },

    render : function() {
        // TODO: Remove this line after select2 update
        $( '.select2-hidden-accessible' ).remove();
        this.log( this + '.render:' );
        this.masthead.render();
        this.renderMessageBox();
        this.renderInactivityBox();
        this.renderPanels();
        // registers the search overlay
        this.invokeSearchOverlay();
        this.removeOverlay();
        this.searchData();
        this.searchedToolLink();
        return this;
    },

    /** Render message box */
    renderMessageBox : function() {
        if ( this.options.message_box_visible ){
            var content = this.options.message_box_content || '';
            var level = this.options.message_box_class || 'info';
            this.$el.addClass( 'has-message-box' );
            this.$messagebox
                .attr( 'class', 'panel-' + level + '-message' )
                .html( content )
                .toggle( !!content )
                .show();
        } else {
            this.$el.removeClass( 'has-message-box' );
            this.$messagebox.hide();
        }
        return this;
    },

    /** Render inactivity warning */
    renderInactivityBox : function() {
        if( this.options.show_inactivity_warning ){
            var content = this.options.inactivity_box_content || '';
            var verificationLink = $( '<a/>' ).attr( 'href', Galaxy.root + 'user/resend_verification' ).text( 'Resend verification' );
            this.$el.addClass( 'has-inactivity-box' );
            this.$inactivebox
                .html( content + ' ' )
                .append( verificationLink )
                .toggle( !!content )
                .show();
        } else {
            this.$el.removeClass( 'has-inactivity-box' );
            this.$inactivebox.hide();
        }
        return this;
    },

    /** Render panels */
    renderPanels : function() {
        var page = this;
        this._panelIds.forEach( function( panelId ){
            if( _.has( page, panelId ) ){
                page[ panelId ].setElement( '#' + panelId );
                page[ panelId ].render();
            }
        });
        if( !this.left ){
            this.center.$el.css( 'left', 0 );
        }
        if( !this.right ){
            this.center.$el.css( 'right', 0 );
        }
        return this;
    },

    /** invokes overlay of the search screen */ 
    invokeSearchOverlay: function( e ) { 
        if( e ) {
            e.stopPropagation();
            var $el_search_screen = $('.search-screen'),
                $el_search_screen_overlay = $('.search-screen-overlay'),
                $el_search_txtbx = $('.txtbx-search-data'),
                $el_search_result = $('.search-results');
            if ( ( e.which === 81 || e.keyCode === 81 ) && e.ctrlKey ) {
                // clears the data of previous search
                $el_search_txtbx.val("");
                $el_search_result.html("");
                // shows the overlay and search screen
                $el_search_screen_overlay.css('display', 'block');
                $el_search_screen.css('display', 'block');
                $el_search_txtbx.focus();
            }
            // removes the overlay and hides the search screen
            else if ( e.which === 27 || e.keyCode === 27 ) {
                this.removeOverlay();
            }
        }
    },
    /** removes the search overlay */ 
    removeOverlay: function() {
        var $el_search_screen = $('.search-screen'),
            $el_search_screen_overlay = $('.search-screen-overlay');
        $el_search_screen_overlay.css('display', 'none');
        $el_search_screen.css('display', 'none');
    },

    /** searches with the query */ 
    searchData: function( e ) {
        if( e ) {
            e.stopPropagation();
            var $el_search_txtbx = $('.txtbx-search-data'),
                query = "",
                url_root = Galaxy.root + 'api/tools',
                $el_search_result = $('.search-results'),
                link = null,
                search_query_minimum_length = 3,
                self = this;
            query = $el_search_txtbx.val();
            query = query.trim();
            if(query.length < search_query_minimum_length) {
                $el_search_result.html("");
            }
            // performs search if enter is pressed or query length increases the minimum character length
            else if ( ( e.which === 13 || e.keyCode === 13 ) || query.length >= search_query_minimum_length ) {
                $.get( url_root, { q: query }, function ( search_result ) {
                    $el_search_result.html("");
                    self._templateHistorySearch( query );
                    self._templateSearchlinks( search_result, self );
                }, "json" );
            }
            // removes the overlay and hides the search screen
            // on clicking escape key
            else if ( e.which === 27 || e.keyCode === 27 ) {
                this.removeOverlay();
            }
        }
    },

    // opens the respective link as the modal pop up or in the center of the main screen
    searchedToolLink: function( e ) {
        if( e ) {
	    var id = "",
	        form_style = "",
	        version = "", 
                $target_element = null;
	    this.removeOverlay();
            // sets the target element as jQuery element
	    if( e.srcElement ) {
                $target_element = $( e.srcElement );
	    }
	    else if( e.target ) {
                $target_element = $( e.target );
	    }
            // fetches the properties
            id = $target_element.attr('data-toolid');
            form_style = $target_element.attr('data-formstyle');
            version = $target_element.attr('data-version');
            // loads as modal popup
	    if( id === 'upload1') {
	        Galaxy.upload.show();
	    }
            // opens the link in the iframe
	    else if ( form_style === 'regular' ) {
	        var form = new ToolForm.View( { id : id, version : version } );
	        form.deferred.execute(function() {
	            Galaxy.app.display( form );
	        });
	    }
            else if ( form_style === 'special' ) {
                // redirects to url other than the Galaxy
                document.location = $target_element.attr('href');
            }
        }
    },

    /** creates collection of templates of all sections and links */
    _templateSearchlinks: function( search_result, self ) {
        var $el_search_result = $('.search-results'),
            template_dict = [];
        for( var i = 0; i < search_result.length; i++ ) {
            var all_sections = Galaxy.toolPanel.attributes.layout.models;
            for( var j = 0; j < all_sections.length; j++ ) {
                var all_tools = all_sections[j].attributes.elems,
                    is_present = false,
                    tools_template = "",
                    section_header_id = "",
                    section_header_name = "";
                for( var k = 0; k < all_tools.length; k++ ) {
                    if( search_result[i] === all_tools[k].id ) {
                        is_present = true;
                        tools_template = tools_template + self._buildLinkTemplate( all_tools[k].attributes );
                    }
                } // end of innermost for loop
                if( is_present ) {
                    section_header_id = all_sections[j].attributes.id;
                    section_header_name = all_sections[j].attributes.name;
                    template_dict = self.appendTemplate( template_dict, section_header_id, section_header_name, tools_template );
                }
            }  // end of second level for loop        
        } // end of first level for loop

        // makes the template of the fetched sections and tools
        self.makeSearchResultTemplate( $el_search_result, template_dict );
    },

    /** searches for items in history list */
    _templateHistorySearch: function( query ) {
        var history_items = Galaxy.currHistoryPanel.collection.models,
            template_string = "",
            $el_search_result = $('.search-results'),
            is_present = false;
        for(var counter = 0; counter < history_items.length; counter++) {
            var item = history_items[counter].attributes,
                name = item.name;
            name = name.toLowerCase();
            query = query.toLowerCase();
            if( name.indexOf( query ) > -1 ) {
                template_string = template_string + this._buildHistorySearchTemplate( item );
                is_present = true;
            }
        }
        // makes the history section only if a result is present
        if( is_present ) {
            $el_search_result.append( this._buildHeaderTemplate( 'history', 'History' ) );
            $el_search_result.append( template_string );
        }
    },

    /** builds links for history searched items */
    _buildHistorySearchTemplate: function( attributes ) {
        return "<a class='history-search-link btn btn-primary " + attributes.dataset_id +
               "' href='/datasets/" + attributes.dataset_id + "/display/?preview=True" +
               "' role='button' title='" + attributes.name +
               "' target='galaxy_main'" +
               ">" + attributes.name + "</a>";
    },

    /** checks if element exists in the collection */
    checkValue: function( collection, id ) {
        for( var i = 0; i < collection.length; i++ ) {
            if( id === collection[i].id ) {
                return true;
            }
        }
        return false;
    },

    /** appends the template or creates a new section */
    appendTemplate: function( collection, id, name, text ) {
        var is_present = false;
        for(var i = 0; i < collection.length; i++ ) {
            if( id === collection[i].id ) {
                collection[i].template = collection[i].template + + " " + text;
                is_present = true;
            }
        }
        if(!is_present) {
            collection.push({ id: id, template: text, name: name });
        }
        return collection;
    },

    /** builds the fetched items template using the dict */ 
    makeSearchResultTemplate: function( $el_search_result, collection ) {
        var header_template = "";
        for( var i = 0; i < collection.length; i++ ) {
            header_template = this._buildHeaderTemplate( collection[i].id, collection[i].name );
            $el_search_result.append( header_template );
            $el_search_result.append( collection[i].template );

            $el_search_result.find("a.tool-search-link").click(function( e ) {
                e.preventDefault();
            });
        }
        // jQuery slow fadeIn effect
        $el_search_result.fadeIn('slow');
    },

    /** builds section header template */
    _buildHeaderTemplate: function( id, name ) {
        return "<div class='search-tool-section-name' data-id='searched_" + id + "' >" + name + "</div>";
    },

    /** builds tool link template */
    _buildLinkTemplate: function( attributes ) {
        return "<a class='tool-search-link btn btn-primary " + attributes.id + " ' href='" + attributes.link +
               "' role='button' title='" + attributes.name + " " + attributes.description +
               "' target='" + attributes.target + "' data-version='" + attributes.version +
               "' minsizehint='" + attributes.min_width +
               "' data-formstyle='" + attributes.form_style + "' data-toolid='" + attributes.id + "' >" + attributes.name + "</a>";
    },

    /** body template */
    _template: function() {
        return [
            // template for search overlay
	    '<div id="search_screen_overlay" class="search-screen-overlay"></div>',
	    '<div id="search_screen" class="search-screen">' +
	        '<input class="txtbx-search-data form-control" type="text" value="" placeholder="Type your query..." />' + 
                '<div class="search-results"></div>' +
	    '</div>',
            '<div id="everything">',
                '<div id="background"/>',
                '<div id="masthead"/>',
                '<div id="messagebox"/>',
                '<div id="inactivebox" class="panel-warning-message" />',
                this.left?   '<div id="left" />' : '',
                this.center? '<div id="center" class="inbound" />' : '',
                this.right?  '<div id="right" />' : '',
            '</div>',
            '<div id="dd-helper" />',
        ].join('');
    },

    /** hide both side panels if previously shown */
    hideSidePanels : function(){
        if( this.left ){
            this.left.hide();
        }
        if( this.right ){
            this.right.hide();
        }
    },

    toString : function() { return 'PageLayoutView'; }
});

// ============================================================================
    return {
        PageLayoutView: PageLayoutView
    };
});
