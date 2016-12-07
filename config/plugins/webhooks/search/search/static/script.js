$(document).ready(function() {

    var ToolForm = window.toolform;
    /** Display search overlay and search */
    var OverlaySearchView = Backbone.View.extend({
         
        parentElement: $('.full-content'),

        initialize: function () {
            this.search_query_minimum_length = 3;
            this.active_filter = "all";
            this.render();
            this.registerEvents();
        },

        render: function() {
            this.parentElement.prepend( this._template() );
        },

        registerEvents: function() {
            var self = this,
                filter_classes = {};
                filter_classes.all = '.all-filter';
                filter_classes.tools = '.tool-filter';
                filter_classes.history = '.history-filter';
                filter_classes.data_library = '.datalibrary-filter';
            
            // Register event for invoking overlay
            this.parentElement.on( 'keydown', function( e ) {
                self.invokeOverlay( e, self );
            });

            // Register events for search textbox
            $( '.txtbx-search-data' ).on( 'keyup', function( e ) { 
                self.triggerSearch( e, self );
                console.log("search box text keyup");
            });
          
            // Register events for fliter clicks
            for( item in filter_classes ) {
                self.clickEvents( filter_classes[ item ], item, self );
            }
        },

        /** Invoke the search overlay */
        invokeOverlay: function( e, self ) {
            if( e ) {
                e.stopPropagation();
                // Click of ctrl + alt + q shows search overlay
	        if ( ( e.which === 81 || e.keyCode === 81 ) && e.ctrlKey && e.altKey ) {

	            $( '.txtbx-search-data' ).val("").focus();
	            self.clearSearchResults();
                    self.showOverlay()
                    pinnedLink = new SearchItemsView({});
                    pinnedLink.buildPinnedLinks();
	        }
	        // Remove the overlay and hides the search screen on clicking escape key
	        else if ( e.which === 27 || e.keyCode === 27 ) {
	            self.removeOverlay();
	        }
            }
        },

        /** Search with the query */ 
        triggerSearch: function( e, self ) {
            var $el_search_txtbx = $( '.txtbx-search-data' ),
                query = "";
            
            if( e ) {
                e.stopPropagation();
                query = (( $el_search_txtbx.val() ).trim()).toLowerCase();
                if( query.length < self.search_query_minimum_length ) {
                    self.clearSearchResults();
                }
                // Perform search if enter is pressed or query has 3 or more characters
                else if ( ( e.which === 13 || e.keyCode === 13 ) || query.length >= self.search_query_minimum_length ) {
                    // Search in all categories and defaults to 'All' search filter in the search overlay
                    self.searchWithAFilter( self, self.active_filter, query );
                }
            }
        },

        /** Click events for the search categories */
        clickEvents: function( selector, type, self ) {
            $( selector ).click(function( e ) {
                self.search( type, this, self );
            });
        },
   
        /** Search with a filter */
        search: function( type, _this, self ) {
            if( !$( _this ).hasClass( 'filter-active' ) ) {
                 var query = (( $( '.txtbx-search-data' ).val() ).trim()).toLowerCase();
                 if( query.length >= self.search_query_minimum_length ) {
                     self.active_filter = type;
                     self.applyTextDecorations( _this );
                     self.searchWithAFilter( self, self.active_filter, query );
                 }
            }
        },

        /** Call with one filter */
        searchWithAFilter: function( self, type, query ) {
	    switch( type ) {
	        case "all":
	            self.searchAllFilters( self, query );
	        break;
	        case "tools":
	            self.searchTools( query );
	        break;
	        case "history":
	            self.searchHistory( query );
	        break;
	        case "data_library":
	            self.searchDataLibrary( query );
	        break;
	        default:
	            self.searchAllFilters( self, query );
	    }
        },

        /** Search in all categories */
        searchAllFilters: function( self, query ) {

	    self.clearSearchResults();
            self.setActiveFilter();

	    // Search for history
	    self.searchHistory( query );
	    // Search for tools
	    self.searchTools( query );
	    // Search for data libraries
	    self.searchDataLibrary( query );
        },

        /** Search in tools */ 
        searchTools: function( query ) {
	    var url = Galaxy.root + 'api/tools';
	    $.get( url, { q: query }, function ( search_result ) {
	        toolSearch = new SearchItemsView( { 'tools': search_result } );
	    }, "json" );
        },

        /** Search in history */
        searchHistory: function( query ) {
	    var history_url = Galaxy.root + 'api/histories';
	    $.get( history_url, function ( histories ) {
	        var history_list = [];
	        // Get the content of each history
	        _.each( histories, function( item ) {
	            var history_item_url = history_url + '/' + item.id + '/contents';
	            $.get( history_item_url, function( history_content ) {
	                _.each( history_content, function( item ) {
	                    var item_name = item.name.toLowerCase();
	                    if ( item_name.indexOf( query ) > -1 ) {
	                        history_list.push( item );
	                    }
	                });
	                historySearch = new SearchItemsView({ 'history': history_list });
	            }, 'json');
	        });
	    }, "json" );
        },

        /** Search in data library */
        searchDataLibrary: function( query ) {
	    var url = Galaxy.root + 'api/libraries?deleted=false';
	    $.get( url, function ( library_data ) {
	        data_lib_list = [];
	        // Filter the result based on query
	        _.each( library_data, function( item ) {
	            var name = item.name.toLowerCase();
	            if ( name.indexOf( query ) > -1 ) {
	                data_lib_list.push( item );
	            }
	        });
	        libSearch = new SearchItemsView({ 'data_library': data_lib_list });
	    }, "json" );
        },

        /** Show overlay */
        showOverlay: function() {
            $( '.search-screen-overlay' ).css( 'display', 'block' );
	    $( '.search-screen' ).css( 'display', 'block' );
        },

        /** Remove the search overlay */ 
        removeOverlay: function() {
            $( '.search-screen-overlay' ).css( 'display', 'none' );
            $( '.search-screen' ).css( 'display', 'none' );
        },

        /** Clear search results */
        clearSearchResults: function() {
            $( '.search-results' ).html( "" );
        },

        /** Set the active filter */
        setActiveFilter: function() {
            var $el_all_filter = $( '.all-filter' );
            $el_all_filter.css( 'text-decoration', 'none' );
	    if( !$el_all_filter.hasClass( 'filter-active' ) ) {
	        $el_all_filter.addClass( 'filter-active' );
	    }
            $( '.overlay-filters' ).css( 'display', 'block' );
        },

        /** Apply the text decoration to the search overlay filters */
        applyTextDecorations: function( self ) {
	    $( '.search-results' ).html( "" );
	    $('.overlay-filters a').css( 'text-decoration', 'underline' ).removeClass( 'filter-active' );
	    $( self ).css( 'text-decoration', 'none' ).addClass( 'filter-active' );
        },

        /** Template for search overlay */
        _template: function() {
            return '<div class="overlay-wrapper">' + 
	           '<div id="search_screen_overlay" class="search-screen-overlay"></div>' +
	           '<div id="search_screen" class="search-screen">' +
	               '<input class="txtbx-search-data form-control" type="text" value="" ' + 
                           'placeholder="Give at least 3 letters to search" />' + 
                       '<div class="overlay-filters">' + 
                           '<a class="all-filter"> All </a>' +
                           '<a class="history-filter"> History </a>' +
                           '<a class="tool-filter"> Tools </a>' +
                           '<a class="workflow-filter"> Workflow </a>' +
                           '<a class="datalibrary-filter"> Data Library </a>' +
                       '</div>' +
                       '<div class="pinned-results"></div>' +
                       '<div class="search-results">' +  
                       '</div>' +
	       '</div>' +
           '</div>';
        },

    });

    /** Display search items from Tools, History and so on */
    var SearchItemsView = Backbone.View.extend({

        self : this,
        data : {},

        /** Initialize the variables */
        initialize: function( item ) {

            var type = ( item ? Object.keys( item )[0] : "" );	    
	    if ( this.data ) {
	        switch( type ) {
		    case "tools": 
		        this.data.tools = item[ type ];
		        break;
		    case "history":
		        this.data.history = item[ type ];
		        break;
		    case "data_library":
		        this.data.data_library = item[ type ];
		        break;
	         }
	        this.refreshView( this.data );
	    }
        },

        /** Return the active filter */
        getActiveFilter: function() {
	    var active_filter = "all";
	        active_filter = ( $( '.tool-filter' ).hasClass( 'filter-active') ? "tools" : active_filter );
	        active_filter = ( $( '.history-filter' ).hasClass( 'filter-active' ) ? "history" : active_filter );
	        active_filter = ( $( '.datalibrary-filter' ).hasClass( 'filter-active' ) ? "data_library" : active_filter );
	    return active_filter;
        },

        /** Update the view as search data comes in */
        refreshView: function( items ) {
	    var has_result = true,
	        $el_search_result = $( '.search-results' ),
	        $el_no_result = $( '.no-results' ),
	        filter = this.getActiveFilter(),
	        data = null;
  
            $el_no_result.remove();
	    if( filter === "all" ) {
	        this.makeAllSection();
	    }
	    else {
	        // If the selected filter has no data
	        data = items[ filter ];
	        if ( !data || data.length === 0 ) {
		    this.showEmptySection( $el_search_result );
		    return;
	        }
	        // Make individual section
	        this.makeSection( filter, data );
	    }
        },

        /** Show empty section if there is no search result */
        showEmptySection: function( $el ) {
	    $el.html( "" );
	    $el.append( this._templateNoResults() );
        },

        /** Make section based on filter and data */
        makeSection: function( filter, data ) {
	    switch( filter ) {
	        case "tools":
		    this.makeToolSection( data );
		    break;
	        case "history":
		    this.makeCustomSearchSection( { 'name': 'History',
		                   'id': 'history',
		                   'class_name': 'search-section search-history',
		                   'link_class_name': 'history-search-link',
		                   'data': data } );
		    break;
	        case "data_library":
		    this.makeCustomSearchSection( { 'name': 'Data Library',
		                   'id': 'datalibrary',
		                   'class_name': 'search-section search-datalib',
		                   'link_class_name': 'datalib-search-link',
		                   'data': data } );
		    break;
	    }
        },

        /** Create templates for all the categories in the search result */
        makeAllSection: function() {
	    var has_result = false,
	        $el_search_result = $( '.search-results' ),
	        self = this;

	    for( type in self.data ) {
	        if( self.data[ type ] ) {
		    has_result = true;
		    type === "tools" && self.makeToolSection( self.data[ type ] );
		    type === "history" && self.data[ "history" ].length > 0 && self.makeCustomSearchSection( { 'name': 'History',
		                       'id': 'history',
		                       'class_name': 'search-section search-history',
		                       'link_class_name': 'history-search-link',
		                       'data': self.data[ type ] } );
		    type === "data_library" && self.data[ "data_library" ].length > 0 && self.makeCustomSearchSection( { 'name': 'Data Library',
		                       'id': 'datalibrary',
		                       'class_name': 'search-section search-datalib',
		                       'link_class_name': 'datalib-search-link',
		                       'data': self.data[ type ] } );
	        }
	    }
	    if( !has_result ) {
	        self.showEmptySection( $el_search_result );
	    }
        },

        /** Check if item is present in the pinned list */
        checkItemPinned: function( item_id ) {
	    var key = window.Galaxy.user.id + "_search_pref",
	        present = false,
	        localStorageObject = null;
	    if ( window.Galaxy.user.id ) {
	        if( localStorage.getItem( key ) ) {
		    localStorageObject = JSON.parse( localStorage.getItem( key ) );
		    if( localStorageObject.pinned_results ) {
		        _.each( localStorageObject.pinned_results, function ( item, item_key ) {
		            if( item_key === item_id ) {
		               present = true;
		            }
		        });
		        return present;
		    }
	        }
	    }
        },

        /** Create collection of templates of all sections and links for tools */
        makeToolSection: function( search_result ) {
	    var template_dict = [], 
	        tool_template = "",
	        self = this,
	        $el_search_result = $( '.search-results' );

	    _.each( search_result, function( item ) {
	        var all_sections = Galaxy.toolPanel.attributes.layout.models;
	        _.each( all_sections, function( section ) {
		    if( section.attributes.model_class === "ToolSection" ) {
		        var all_tools = section.attributes.elems,
		            is_present = false,
		            tools_template = "",
		            section_header_id = "",
		            section_header_name = "";

		        _.each( all_tools, function( tool ) {
		            if( tool.id === item ) {
		                var attrs = tool.attributes;
		                if( !self.checkItemPinned( attrs.id ) ) {
		                     is_present = true;
		                     tools_template = tools_template + self._buildLinkTemplate( attrs.id, attrs.link, attrs.name, attrs.description, attrs.target, 'tool-search-link', attrs.version, attrs.min_width, attrs.form_style );
		                }
		            }
		        });
		        if( is_present ) {
		            section_header_id = section.attributes.id;
		            section_header_name = section.attributes.name;
		            template_dict = self.appendTemplate( template_dict, section_header_id, section_header_name, tools_template );
		        }
		    }
		    else if( section.attributes.model_class === "Tool" || section.attributes.model_class === "DataSourceTool" ) {
		        var attributes = section.attributes;
		        if( item === attributes.id ) {
		            if( !self.checkItemPinned( attributes.id ) ) {
		                tool_template = tool_template + self._buildLinkTemplate( attributes.id, attributes.link, attributes.name, attributes.description, attributes.target, 'tool-search-link', attributes.version, attributes.min_width, attributes.form_style );
		            }
		        }
		    }
	        });
	    });

	    // Remove the tool search result section if already present
	    $el_search_result.find('.search-tools').remove();
	    // Make template for sections and tools
	    self.makeToolSearchResultTemplate( template_dict, tool_template );        
        },

        /** Append the template or creates a new section */
        appendTemplate: function( collection, id, name, text ) {
	    var is_present = false;
 
	    _.each( collection, function( item ) {
	        if( id === item.id ) {
		    item.template = item.template + " " + text;
		    is_present = true;
	        }
	    });
	    if(!is_present) {
	        collection.push( { id: id, template: text, name: name } );
	    }
	    return collection;
        },

        /** Register tool search link click */
        registerToolLinkClick: function( self, $el ) {
	    $el.find( "a.tool-search-link" ).click(function( e ) {
	        e.preventDefault();
	        self.searchedToolLink( self, e );
	    });
	    $el.find( "a>i.remove-item" ).click(function( e ) {
	        e.preventDefault();
	        e.stopPropagation();
	        self.removeFromDataStorage( self, $( this ).parent() );
	        $( this ).parent().remove();
	    });
        },

        /** Register clicks for pinned links from custom section */
        registerCustomPinnedLinkClicks: function( self, $el) {

	    $el.find( "a>i.remove-item" ).click(function( e ) {
	        e.preventDefault();
	        e.stopPropagation();
	        self.removeFromDataStorage( self, $( this ).parent() );
	        $( this ).parent().remove();
	    });

	    $el.find( ".btn" ).click(function( e ) {
	        self.removeOverlay();
	    });
        },
 
        /** Click events for pin and remove search items */
        makePinRemoveItems: function( $el_pin_item, $el_remove_item, self ) {
	    $el_pin_item.css( "margin-left", "2px" );
	    $el_remove_item.css( "margin-left", "2px" );
	    $el_pin_item.click(function( e ) {
	        e.preventDefault();
	        e.stopPropagation();
	        self.pinLink( self, $( this ).parent() );
	        $( this ).parent().remove();
	    });
	    $el_remove_item.click(function( e ) {
	        e.preventDefault();
	        e.stopPropagation();
	        $( this ).parent().remove();
	    });
        },

        /** Build the fetched items template using the template dictionary */ 
        makeToolSearchResultTemplate: function( collection, tool_template ) {
	    var header_template = "",
	        self = this,
	        $el_search_result = $( '.search-results' ),
	        $el_pin_item = null,
	        $el_remove_item = null;

	    $el_search_result.find('.tool-search-link').remove();
	    if( self.getActiveFilter() === "all" ) {
	        $el_search_result.append( self._buildHeaderTemplate( "tools", "Tools", "search-section search-tools" ) );
	    }
	    _.each( collection, function( item ) {
	        $el_search_result.append( item.template );
	    });

	    $el_search_result.append(tool_template);
	    self.registerToolLinkClick( self, $el_search_result );

	    $el_pin_item = $( '.tool-search-link' ).find( "i.pin-item" );
	    $el_remove_item = $( '.tool-search-link' ).find( "i.remove-item" );

	    self.makePinRemoveItems( $el_pin_item, $el_remove_item, self );

	    // jQuery slow fadeIn effect
	    $el_search_result.fadeIn( 'slow' );
        },

        /** Open the respective link as the modal pop up or in the center of the main screen */
        searchedToolLink: function( _self, e ) {
	    var id = "",
	        form_style = "",
	        version = "", 
	        $target_element = null;
	    if( e ) {
	        _self.removeOverlay();
	        // Set the target element as jQuery element
	        if( e.srcElement ) {
		    $target_element = $( e.srcElement );
	        }
	        else if( e.target ) {
		    $target_element = $( e.target );
	        }
	        // Fetch the properties
	        id = $target_element.attr( 'data-toolid' );
	        form_style = $target_element.attr( 'data-formstyle' );
	        version = $target_element.attr( 'data-version' );
	        // Load as modal popup
	        if( id === 'upload1' ) {
		    Galaxy.upload.show();
	        }
	        // Open the link in the iframe
	        else if ( form_style === 'regular' ) {
		    var form = new ToolForm.View( { id : id, version : version } );
		    form.deferred.execute(function() {
		        Galaxy.app.display( form );
		    });
	        }
	        else if ( form_style === 'special' ) {
		    // Redirect to url other than the Galaxy
		    document.location = $target_element.attr( 'href' );
	        }
	    }
        },

        /** Make custom search section */
        makeCustomSearchSection: function( section_object ) {
	    var template_string = "",
	        $el_search_result = $( '.search-results' ),
	        $el_section_link = $( "." + section_object.link_class_name ),
	        self = this,
	        link = "",
	        target = 'galaxy_main',
	        data_type = "";
	    if( section_object.link_class_name.indexOf( 'history' ) > -1 ) {
	        data_type = "history";
	    }
	    else if( section_object.link_class_name.indexOf( 'datalib' ) > -1 ) {
	        data_type = "data library";
	    }

	    $el_search_result.find( '.' + section_object.class_name.split(" ")[1] ).remove();
	    $el_search_result.find( '.' + section_object.link_class_name ).remove();

	    _.each( section_object.data, function( item ) {
	        if( !self.checkItemPinned( item.id ) ) {
		    if( data_type === "history" ) {
		        link = "/datasets/" + item.id + "/display/?preview=True";
		    }
		    else if( data_type === "data library" ) {
		        link = Galaxy.root + "library/list#folders/" + item.root_folder_id;
		    }
	        template_string = template_string + self._buildLinkTemplate( item.id, link, item.name, item.description, target, section_object.link_class_name );
	        }
	    });

	    // Append section header if filter is "all"
	    if( self.getActiveFilter() === "all" ) {
	        $el_search_result.append( self._buildHeaderTemplate( section_object.id, section_object.name, section_object.class_name ) );
	    }
	    $el_search_result.append( template_string );
	    $el_search_result.find( "." + section_object.link_class_name ).css( 'margin-top', '0.5%' );
	    $el_search_result.find( "." + section_object.link_class_name ).click(function( e ) {
	        self.removeOverlay();
	    });

	    $el_pin_item = $( '.' + section_object.link_class_name ).find( "i.pin-item" );
	    $el_remove_item = $( '.' + section_object.link_class_name ).find( "i.remove-item" );
	    self.makePinRemoveItems( $el_pin_item, $el_remove_item, self );
        },

        /** Build pinned links if any when search overlay is invoked */ 
        buildPinnedLinks: function() {
	    var self = this,
	        pinned_results = {},
	        pinned_html = "",
	        key = window.Galaxy.user.id + "_search_pref";
	    // Build the pinned result if any
	    if ( window.Galaxy.user.id ) {
	        if( localStorage.getItem( key ) ) {
		    var items = localStorage.getItem( key ),
		        $el_pinned_result = $( ".pinned-results" );
		    pinned_results = JSON.parse( items ).pinned_results;
		    for( item in pinned_results ) {
		        pinned_html = pinned_html + pinned_results[item];
		    }
		    $el_pinned_result.html( "" );
		    $el_pinned_result.html( pinned_html );
		    $el_pinned_result.find( '.pin-item' ).remove();
		    self.registerToolLinkClick( self, $el_pinned_result );
		    self.registerCustomPinnedLinkClicks( self, $el_pinned_result );
	        }
	    }
        },

        /** Remove the delete item from localstorage */
        removeFromDataStorage: function( self, $el ) {
	    var key = "",
	        localStorageObject = {},
	        $el_pinned_result = $( ".pinned-results" ),
	        link_id = "",
	        elem = $el[0].outerHTML;
	    link_id = $( elem ).attr( 'class' ).split(" ")[3];
	    if ( window.Galaxy.user.id ) {
	        key = window.Galaxy.user.id + "_search_pref";
	        if( localStorage.getItem( key ) ) {
		    localStorageObject = JSON.parse( localStorage.getItem( key ) );
		    if( localStorageObject.pinned_results ) {
		        delete localStorageObject.pinned_results[ link_id ];
		        localStorage.setItem( key, JSON.stringify( localStorageObject ) );
		    }
	        }
	    }
        },

        /** Set local/session storage for pinned/removed search results */
        setDataStorage: function( self, elem ) {
	    var key = "",
	        localStorageObject = {},
	        $el_pinned_result = $( ".pinned-results" ),
	        link_id = "";

	    link_id = $( elem ).attr( 'class' ).split(" ")[3];
	    if ( window.Galaxy.user.id ) {
	        key = window.Galaxy.user.id + "_search_pref";
	        if( localStorage.getItem( key ) ) {
		    localStorageObject = JSON.parse( localStorage.getItem( key ) );
		    if( localStorageObject.pinned_results ) {
		        localStorageObject.pinned_results[link_id] = elem;
		    }
		    else {
		        localStorageObject.pinned_results = {};
		        localStorageObject.pinned_results[link_id] = elem;
		    }
	        }
	        else {
		    localStorageObject.pinned_results = {};
		    localStorageObject.pinned_results[link_id] = elem;
	        }
	        localStorage.setItem( key, JSON.stringify( localStorageObject ) );
	        $el_pinned_result.append( elem );
	        $el_pinned_result.find( '.pin-item' ).remove();
	        self.registerToolLinkClick( self, $el_pinned_result );
	        self.registerCustomPinnedLinkClicks( self, $el_pinned_result );
	    }
	    else {
	        // TODO: Show pinned results even when user id not 
	        // logged and store them in sessionStorage (not in localStorage)
	        key = "search_pref";
	    }
        },

        /** Pin link to the top */
        pinLink: function( self, $el ) {
	    self.setDataStorage( self, $el[0].outerHTML );
        },

        /** Return links template */
        _buildLinkTemplate: function( id, link, name, description, target, cls, version, min_width, form_style ) {
	    var template = "";
	        template = "<a class='" + cls + " btn btn-primary " + id + "' href='" + link +
	                   "' role='button' title='" + name + " " + (description ? description : "") +
	                   "' target='" + target;
	        if( cls.indexOf('tool') > -1 ) {
		    template = template + "' data-version='" + version +
		               "' minsizehint='" + min_width +
		               "' data-formstyle='" + form_style + "' data-toolid='" + id;
	        }
	        template = template + "' >" + name + "<i class='fa fa-paperclip pin-item' aria-hidden='true' title='Pin it to top'></i>" +
		           "<i class='fa fa-times remove-item' aria-hidden='true' title='Remove it from search result'></i>" +
		           "</a>";
	    return template;
        },

        /** Build section header template */
        _buildHeaderTemplate: function( id, name, cls ) {
	    return "<div class='" + cls + "' data-id='searched_" + id + "' >" + name + "</div>";
        },

        /** Template for no results for any query */
        _templateNoResults: function() {
	    return '<div class="no-results">No results for this query</div>';
        },

        /** Remove the search overlay */ 
        removeOverlay: function() {
	    $( '.search-screen-overlay' ).css( 'display', 'none' );
	    $( '.search-screen' ).css( 'display', 'none' );
        }
    });

    var OverlaySearchApp = new OverlaySearchView;
    var SearchItemsApp = new SearchItemsView;
  
});
