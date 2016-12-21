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

        /** Render the overlay html */
        render: function() {
            this.parentElement.prepend( this._template() );
        },

        /** Register events for the overlay */
        registerEvents: function() {
            var self = this,
                filter_classes = {};
                filter_classes.all = '.all-filter';
                filter_classes.tools = '.tool-filter';
                filter_classes.history = '.history-filter';
                filter_classes.data_library = '.datalibrary-filter';
                filter_classes.workflow = '.workflow-filter';
                filter_classes.removeditems = '.removeditems-filter';
                filter_classes.pinnedfilter = '.pinned-filter';
            
            // Register event for invoking overlay
            this.parentElement.on( 'keydown', function( e ) {
                self.invokeOverlay( e, self );
            });

            // Register events for search textbox
            $( '.txtbx-search-data' ).on( 'keyup', function( e ) { 
                self.triggerSearch( e, self );
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
	            self.clearSearchResults();
                    self.showOverlay();
                    self.setActiveFilter( '.pinned-filter' );
                    self.showPinnedItemsByDefault();
	        }
	        // Remove the overlay and hides the search screen on clicking escape key
	        else if ( e.which === 27 || e.keyCode === 27 ) {
	            self.removeOverlay();
	        }
            }
        },

        /** Search with a query */ 
        triggerSearch: function( e, self ) {
            var $el_search_textbox = $( '.txtbx-search-data' ),
                query = "";
            
            if( e ) {
                e.stopPropagation();
                query = (( $el_search_textbox.val() ).trim()).toLowerCase();
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
                if( type.indexOf('removed') > -1 ) {
                    removedLink = new SearchItemsView({});
                    removedLink.showRemovedLinks();
                    $('.removed-items').show();
                    $('.search-results').hide();
                    $('.pinned-items').hide();
                    self.applyTextDecorations( this );
                }
                else if( type.indexOf('pinned') > -1 ) {
                    self.showPinnedItemsByDefault( self );
                    self.applyTextDecorations( this );
                }
                else {
                    self.search( type, this, self );
                }
            });
        },

        showPinnedItemsByDefault: function( self, _self ) {
             pinnedLink = new SearchItemsView({});
             pinnedLink.showPinnedItems();
             $('.removed-items').hide();
             $('.search-results').hide();
             $('.pinned-items').show();
        },
   
        /** Search with a filter */
        search: function( type, _this, self ) {
            if( !$( _this ).hasClass( 'filter-active' ) ) {
                 var query = (( $( '.txtbx-search-data' ).val() ).trim()).toLowerCase();
                 if( query.length >= self.search_query_minimum_length ) {
                     self.active_filter = type;
                     self.applyTextDecorations( _this );
                     self.searchWithAFilter( self, self.active_filter, query );
                     self.showSearchResult();
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
                case "workflow":
                    self.searchWorkflow( query );
                    break;
	    }
        },

        /** Search in all categories */
        searchAllFilters: function( self, query ) {
	    self.clearSearchResults();
            self.setActiveFilter( '.all-filter' );
            self.showSearchResult();
	    // Search for history
	    self.searchHistory( query );
	    // Search for tools
	    self.searchTools( query );
	    // Search for data libraries
	    self.searchDataLibrary( query );
            // Search for workflows
            self.searchWorkflow( query );
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

        /** Search in workflow */
        searchWorkflow: function( query ) {
            var url = Galaxy.root + 'api/workflows';
	    $.get( url, function ( workflow_data ) {
	        workflow_list = [];
	        // Filter the result based on query
	        _.each( workflow_data, function( item ) {
	            var name = item.name.toLowerCase();
	            if ( name.indexOf( query ) > -1 ) {
	                workflow_list.push( item );
	            }
	        });
	        workflowSearch = new SearchItemsView({ 'workflow': workflow_list });
	    }, "json" );

        },

        /** Show overlay */
        showOverlay: function() {
            var $el_search_textbox = $( '.txtbx-search-data' );
            $( '.search-screen-overlay' ).show();
	    $( '.search-screen' ).show();
            $el_search_textbox.val( "" );
            $el_search_textbox.focus();
        },

        /** Remove the search overlay */ 
        removeOverlay: function() {
            $( '.search-screen-overlay' ).hide();
            $( '.search-screen' ).hide();
        },

        /** Clear search results */
        clearSearchResults: function() {
            $( '.search-results' ).html( "" );
        },

        /** Show search result section and hide removed items */
        showSearchResult: function() {
            $( '.removed-items' ).hide();
            $( '.pinned-items' ).hide();
            $( '.search-results' ).show();
        },

        /** Set the active filter */
        setActiveFilter: function( filter_class ) {
            var $el_filter = $( filter_class );
	    if( !$el_filter.hasClass( 'filter-active' ) ) {
                $( '.overlay-filters a' ).addClass( 'filter-inactive' ).removeClass( 'filter-active' );
	        $el_filter.addClass( 'filter-active' ).removeClass( 'filter-inactive' );
	    }
            $( '.overlay-filters' ).show();
        },

        /** Apply the text decoration to the search overlay filters */
        applyTextDecorations: function( self ) {
	    $( '.search-results' ).html( "" );
            $( '.overlay-filters a' ).addClass( 'filter-inactive' ).removeClass( 'filter-active' );
            $( self ).removeClass( 'filter-inactive' ).addClass( 'filter-active' );
        },

        /** Template for search overlay */
        _template: function() {
            return '<div class="overlay-wrapper">' + 
	           '<div id="search_screen_overlay" class="search-screen-overlay"></div>' +
	           '<div id="search_screen" class="search-screen">' +
	               '<input class="txtbx-search-data form-control" type="text" value="" ' + 
                           'placeholder="Give at least 3 letters to search" />' + 
                       '<div class="overlay-filters">' +
                           '<a class="pinned-filter" title="Bookmarked items"><i class="fa fa-bookmark-o"></i></a>' +
                           '<a class="all-filter" title="All search results"><i class="fa fa-home"></i></a>' +
                           '<a class="history-filter" title="History"><i class="fa fa-history"></i></a>' +
                           '<a class="tool-filter" title="Tools"><i class="fa fa-wrench"></i></a>' +
                           '<a class="workflow-filter" title="Workflow"><i class="fa fa-code-fork rotate"></i></a>' +
                           '<a class="datalibrary-filter" title="Data Library"><i class="fa fa-folder-open-o"></i></a>' +
                           '<a class="removeditems-filter" title="Removed from search"><i class="fa fa-recycle"></i></a>' +
                       '</div>' +
                       '<div class="removed-items"></div>' +
                       '<div class="pinned-items"></div>' +
                       '<div class="search-results"></div>' +
	       '</div>' +
           '</div>';
        },

    });

    /** Display search items from Tools, History, Workflow and Data libraries */
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
                    case "workflow":
                        this.data.workflow = item[ type ];
	         }
	        this.refreshView( this.data );
	    }
        },

        /** Return the active filter */
        getActiveFilter: function() {
	    var active_filter = "pinneditems";
                active_filter = ( $( '.all-filter' ).hasClass( 'filter-active') ? "all" : active_filter );
	        active_filter = ( $( '.tool-filter' ).hasClass( 'filter-active') ? "tools" : active_filter );
	        active_filter = ( $( '.history-filter' ).hasClass( 'filter-active' ) ? "history" : active_filter );
	        active_filter = ( $( '.datalibrary-filter' ).hasClass( 'filter-active' ) ? "data_library" : active_filter );
                active_filter = ( $( '.workflow-filter' ).hasClass( 'filter-active' ) ? "workflow" : active_filter );
                active_filter = ( $( '.removeditems-filter' ).hasClass( 'filter-active' ) ? "removeditems" : active_filter );
                active_filter = ( $( '.pinned-filter' ).hasClass( 'filter-active' ) ? "pinneditems" : active_filter );
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
	        this.makeAllSection( items );
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
                case "workflow":
                    this.makeCustomSearchSection( { 'name': 'Workflow',
		                   'id': 'workflow',
		                   'class_name': 'search-section search-workflow',
		                   'link_class_name': 'workflow-search-link',
		                   'data': data } );
                    break;
	    }
        },

        /** Create templates for all the categories in the search result */
        makeAllSection: function( data ) {
	    var has_result = false,
	        $el_search_result = $( '.search-results' ),
	        self = this;
	    for( type in data ) {
                if( data[ type ] && data[ type ].length > 0 ) {
                    has_result = true;
                    self.makeSection( type, data[type] );
                }
                else {
                    switch( type ) {
                        case "history":
                            $( '.history-search-link' ).remove();
                            $( '.search-history' ).remove();
                            break;
                        case "tools":
                            $( '.tool-search-link' ).remove();
                            $( '.search-tools' ).remove();
                            break;
                        case "workflow":
                            $( '.workflow-search-link' ).remove();
                            $( '.search-workflow' ).remove();
                            break;
                        case "data_library":
                            $( '.datalib-search-link' ).remove();
                            $( '.search-datalib' ).remove();
                            break;
                    }
                }
	    }
	    if( !has_result ) {
	        self.showEmptySection( $el_search_result );
	    }
        },

        /** Check if item is present in the removed list */
        checkItemRemoved: function( item_id ) {
	    var key = window.Galaxy.user.id + "_removed_items",
	        present = false,
	        localStorageObject = null;
	    if ( window.Galaxy.user.id ) {
	        if( localStorage.getItem( key ) ) {
		    localStorageObject = JSON.parse( localStorage.getItem( key ) );
		    if( localStorageObject.removed_results ) {
		        _.each( localStorageObject.removed_results, function ( item, item_key ) {
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
		                if( !self.checkItemRemoved( attrs.id ) ) {
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
		            if( !self.checkItemRemoved( attributes.id ) ) {
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
        registerToolLinkClick: function( self ) {
	    $( "a.tool-search-link" ).click(function( e ) {
	        e.stopPropagation();
                e.preventDefault();
	        self.searchedToolLink( self, e );
	    });
        },

        /** Register clicks for removed links from custom section */
        registerRemoveLinkClicks: function( self ) {
            $( '.restore-item' ).click(function( e ) {
	        e.preventDefault();
	        e.stopPropagation();
	        self.removeFromDataStorage( self, $( this ).parent(), '.removed-items', '_removed_items' );
	        $( this ).parent().remove();
	    });
            $( '.remove-item' ).click(function( e ) {
	        e.preventDefault();
	        e.stopPropagation();
	        self.removeFromDataStorage( self, $( this ).parent(), '.pinned-items', '_pinned_items' );
	        $( this ).parent().remove();
	    });
        },
 
        /** Register remove and pin action clicks */
        registerLinkActionClickEvent: function( self ) {
	    $( "a .remove-item" ).click(function( e ) {
	        e.preventDefault();
	        e.stopPropagation();
	        self.setStorage( self, $( this ).parent() );
	        $( this ).parent().remove();
	    });

            $( "a .pin-item" ).click(function( e ) {
	        e.preventDefault();
	        e.stopPropagation();
                if( $( this ).hasClass( 'pinned-item' ) ) {
                    self.removeFromDataStorage( self, $( this ).parent(), '.pinned-items', '_pinned_items' );
                    $( this ).removeClass( 'pinned-item' );
                    $( this ).attr( 'title', 'Bookmark to favourites' );
                }
                else {
                    self.setPinnedItemsStorage( self, $( this ).parent() );
                    $( this ).addClass( 'pinned-item' );
                    $( this ).attr( 'title', 'Bookmarked' );
                }
	    });
        },

        /**Set localstorage for pinned items */
        setPinnedItemsStorage: function( self, $el ) {
            var elem = $el[0].outerHTML,
                key = "",
	        localStorageObject = {},
	        link_id = "";
	    link_id = $( elem ).attr( 'data-id' );
	    if ( window.Galaxy.user.id ) {
	        key = window.Galaxy.user.id + "_pinned_items";
	        if( localStorage.getItem( key ) ) {
		    localStorageObject = JSON.parse( localStorage.getItem( key ) );
		    if( localStorageObject.removed_results ) {
		        localStorageObject.removed_results[ link_id ] = elem;
		    }
		    else {
		        localStorageObject.removed_results = {};
		        localStorageObject.removed_results[ link_id ] = elem;
		    }
	        }
	        else {
		    localStorageObject.removed_results = {};
		    localStorageObject.removed_results[ link_id ] = elem;
	        }
                
	        localStorage.setItem( key, JSON.stringify( localStorageObject ) );
	    }
	    else {
	        // TODO: Show removed results even when user id not 
	        // logged and store them in sessionStorage (not in localStorage)
	        key = "search_pref";
	    }
        },

        /** Display pinned items */
        showPinnedItems: function() {
            var self = this,
	        pinned_results = {},
	        html_text = "",
	        key = window.Galaxy.user.id + "_pinned_items";
	    if ( window.Galaxy.user.id ) {
	        if( localStorage.getItem( key ) ) {
		    var items = localStorage.getItem( key ),
		        $el_pinned_result = $( ".pinned-items" );
                    $el_pinned_result.html( "" );
		    pinned_results = JSON.parse( items ).removed_results;
                    // Build html text from localstorage
		    for( item in pinned_results ) {
		        html_text = html_text + pinned_results[ item ];
		    }
		    $el_pinned_result.show();
		    $el_pinned_result.html( html_text );

                    // Update items in html text
                    $el_pinned_result.find( '.pin-item' ).remove();
                    $el_pinned_result.find( '.remove-item' ).attr( 'title', 'Delete from favourites' );

		    // Register events
                    self.registerRemoveLinkClicks( self );
                    self.registerToolLinkClick( self );
                    $el_pinned_result.find( '.history-search-link' ).click(function( e ) {
                        self.removeOverlay();
                    });
	        }
	    }
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
	    self.registerToolLinkClick( self );

	    $el_remove_item = $( '.tool-search-link' ).find( "a .remove-item" );
            $el_pin_item = $( '.tool-search-link' ).find( "a .pin-item" );
	    self.registerLinkActionClickEvent( self );

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
	        id = $target_element.attr( 'data-id' );
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
	        target = '_top',
	        data_type = "";
	    if( section_object.link_class_name.indexOf( 'history' ) > -1 ) {
	        data_type = "history";
	    }
	    else if( section_object.link_class_name.indexOf( 'datalib' ) > -1 ) {
	        data_type = "data library";
	    }
            else if( section_object.link_class_name.indexOf( 'workflow' ) > -1 ) {
	        data_type = "workflow";
	    }

	    $el_search_result.find( '.' + section_object.class_name.split(" ")[1] ).remove();
	    $el_search_result.find( '.' + section_object.link_class_name ).remove();

	    _.each( section_object.data, function( item ) {
	        if( !self.checkItemRemoved( item.id ) ) {
                    switch( data_type ) {
                        case "history":
                            link = "/datasets/" + item.id + "/display/?preview=True";
                            target = 'galaxy_main';
                            break;
                        case "data library":
                            link = Galaxy.root + "library/list#folders/" + item.root_folder_id;
                            break;
                        case "workflow":
                            link = Galaxy.root + "workflow/editor?id=" + item.id;
                            break;
                    }
	        template_string = template_string + self._buildLinkTemplate( item.id,
                                                                             link,
                                                                             item.name,
                                                                             item.description,
                                                                             target,
                                                                             section_object.link_class_name );
	        }
	    });

	    // Append section header if filter is "all"
	    if( self.getActiveFilter() === "all" ) {
	        $el_search_result.append( self._buildHeaderTemplate( section_object.id,
                                                                     section_object.name,
                                                                     section_object.class_name ) );
	    }
	    $el_search_result.append( template_string );
	    $el_search_result.find( "." + section_object.link_class_name ).click(function( e ) {
	        self.removeOverlay();
	    });

	    $el_remove_item = $( '.' + section_object.link_class_name ).find( "a .remove-item" );
            $el_pin_item = $( '.' + section_object.link_class_name ).find( "a .pin-item" );
	    self.registerLinkActionClickEvent( self );
        },

        /** Build removed links */ 
        showRemovedLinks: function() {
	    var self = this,
	        removed_results = {},
	        html_text = "",
                key_suffix = "_removed_items",
                item_class_name = '.restore-item',
                class_name = '.removed-items',
	        key = window.Galaxy.user.id + key_suffix;
	    // Build the removed result if any
	    if ( window.Galaxy.user.id ) {
	        if( localStorage.getItem( key ) ) {
		    var items = localStorage.getItem( key ),
		        $el_removed_result = $( class_name );
		    removed_results = JSON.parse( items ).removed_results;
                    $el_removed_result.html( "" );
		    for( item in removed_results ) {
		        html_text = html_text + self._templateRemovedItem( item, removed_results[item] );
		    }
		    $el_removed_result.html( html_text );
		    self.registerRemoveLinkClicks( self );
	        }
	    }
        },

        /** Remove the delete item from localstorage */
        removeFromDataStorage: function( self, $el, class_name, key_name ) {
	    var key = "",
	        localStorageObject = {},
	        $el_removed_result = $( class_name ),
	        link_id = "",
	        elem = $el[0].outerHTML;
	    link_id = ( $( elem ).attr( 'id' ) ? $( elem ).attr( 'id' ) : $( elem ).attr( 'data-id' ) );
	    if ( window.Galaxy.user.id ) {
	        key = window.Galaxy.user.id + key_name;
	        if( localStorage.getItem( key ) ) {
		    localStorageObject = JSON.parse( localStorage.getItem( key ) );
		    if( localStorageObject.removed_results ) {
		        delete localStorageObject.removed_results[ link_id ];
		        localStorage.setItem( key, JSON.stringify( localStorageObject ) );
		    }
	        }
	    }
        },

        /** Set local/session storage for removed results */
        setLocalStorageForRemovedLinks: function( self, elem ) {
	    var key = "",
	        localStorageObject = {},
	        $el_removed_result = $( ".removed-items" ),
	        link_id = "",
                name = "",
                removed_item_template = "";

	    link_id = $( elem ).attr( 'data-id' );
            name = $( elem ).attr( 'title' );
	    if ( window.Galaxy.user.id ) {
	        key = window.Galaxy.user.id + "_removed_items";
	        if( localStorage.getItem( key ) ) {
		    localStorageObject = JSON.parse( localStorage.getItem( key ) );
		    if( localStorageObject.removed_results ) {
		        localStorageObject.removed_results[link_id] = name;
		    }
		    else {
		        localStorageObject.removed_results = {};
		        localStorageObject.removed_results[link_id] = name;
		    }
	        }
	        else {
		    localStorageObject.removed_results = {};
		    localStorageObject.removed_results[link_id] = name;
	        }
                
	        localStorage.setItem( key, JSON.stringify( localStorageObject ) );
	    }
	    else {
	        // TODO: Show removed results even when user id not 
	        // logged and store them in sessionStorage (not in localStorage)
	        key = "search_pref";
	    }
        },

        /** Set localstorage for the removed links */
        setStorage: function( self, $el ) {
	    self.setLocalStorageForRemovedLinks( self, $el[0].outerHTML );
        },

        /** Return links template */
        _buildLinkTemplate: function( id, link, name, description, target, cls, version, min_width, form_style ) {
	    var template = "";
	        template = "<a class='" + cls + " btn btn-primary link-tile' href='" + link +
	                   "' role='button' title='" + name +
	                   "' target='" + target + 
                           "' data-id='" + id;
	        if( cls.indexOf('tool') > -1 ) {
		    template = template + "' data-version='" + version +
		               "' minsizehint='" + min_width +
		               "' data-formstyle='" + form_style;
	        }
                template = template + "' ><span class='fa fa-thumb-tack pin-item actions' aria-hidden='true'" +
                           "title='Bookmark to favourites'></span><span class='fa fa-trash-o remove-item actions' aria-hidden='true'" +   
                           "title='Move to removed items'></span><b>" + name + " </b>" + (description ? description : "") + "</a>";
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

        /** Template for removed itmes */
        _templateRemovedItem: function( id, name ) {
            return "<span class='btn btn-primary exclude' id='"+ id +"'>" + name + "<span class='fa fa-undo restore-item'" +   
                   "title='Delete from removed list'></span></span>";
        },

        /** Remove the search overlay */ 
        removeOverlay: function() {
	    $( '.search-screen-overlay' ).hide();
	    $( '.search-screen' ).hide();
        }
    });
    searchOverlay = new OverlaySearchView();
    searchItems = new SearchItemsView();
});
