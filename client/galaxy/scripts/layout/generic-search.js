/** Generic search feature **/
define(["mvc/tool/tool-form", 'libs/underscore'], function( ToolForm, _ ) {

var SearchOverlay = Backbone.View.extend({

    initialize: function ( ) {
        this.search_query_minimum_length = 3;
        this.active_filter = "all";
        $('.full-content').prepend( this._template() );
    },

    /** Invoke the search overlay */
    invokeOverlay: function( evt ) {
        var $el_search_screen = $( '.search-screen' ),
	    $el_search_screen_overlay = $( '.search-screen-overlay' ),
	    $el_search_txtbx = $( '.txtbx-search-data' ),
	    $el_search_result = $( '.search-results' );
        if( evt ) {
	    evt.stopPropagation();
            // Click of ctrl + alt + q shows search overlay
	    if ( ( evt.which === 81 || evt.keyCode === 81 ) && evt.ctrlKey && evt.altKey ) {
	        // Clear the data of previous search
	        $el_search_txtbx.val( "" );
	        $el_search_result.html( "" );
	        // Show the overlay and search screen
	        $el_search_screen_overlay.css( 'display', 'block' );
	        $el_search_screen.css( 'display', 'block' );
	        $el_search_txtbx.focus();
	    }
	    // Remove the overlay and hides the search screen on clicking escape key
	    else if ( evt.which === 27 || evt.keyCode === 27 ) {
	        this.removeOverlay();
                this.resetCurrentDatasetSearch();
	    }
        }
    },

    /** Register the events */
    render: function() {
        var self = this, 
            $el_search_textbox = $('.txtbx-search-data');
        this.removeOverlay();
        // Register the keyup event in the search textbox
        $el_search_textbox.on('keyup', function( e ) { 
            self.searchData( self, e );
        });
        this.registerFilterClicks( self );
        return this;
    },

    /** Remove the search overlay */ 
    removeOverlay: function() {
        var $el_search_screen = $( '.search-screen' ),
            $el_search_screen_overlay = $( '.search-screen-overlay' );
        $el_search_screen_overlay.css( 'display', 'none' );
        $el_search_screen.css( 'display', 'none' );
    },

    /** Search with the query */ 
    searchData: function( self, e ) {
        var $el_search_txtbx = $( '.txtbx-search-data' ),
            query = "",
            url_root = Galaxy.root + 'api/tools',
            $el_search_result = $( '.search-results' ),
            link = null,
            search_result = null;

        if( e ) {
            e.stopPropagation();
            query = ( $el_search_txtbx.val() ).trim();

            if( query.length < self.search_query_minimum_length ) {
                $el_search_result.html("");
            }
            // Perform search if enter is pressed or query length increases the minimum character length
            else if ( ( e.which === 13 || e.keyCode === 13 ) || query.length >= self.search_query_minimum_length ) {
                // searches in all categories and defaults to 'All' search filter in the search overlay
                self.searchOne( self, self.active_filter, query );
            }
        }
    },

    /** Register filter click events */
    registerFilterClicks: function( self ) {
        self.clickEvents( '.all-filter', "all", self );
        self.clickEvents( '.tool-filter', "tools", self );
        self.clickEvents( '.currdataset-filter', "current_dataset", self );
        self.clickEvents( '.datalibrary-filter', "data_library", self );
    },

    /** Reset the original current dataset search */
    resetCurrentDatasetSearch: function() {
        var $el = $( '.search-input .search-query' );
        $el.focus();
        // Trigger the escape key press
        $el.trigger( $.Event( "keyup", { keyCode: 27, which: 27 } ) );
        $el.blur();
    },

    /** Click events for the search categories */
    clickEvents: function( selector, type, self ) {
        $( selector ).click(function( e ) {
            self.searchWithFilter( type, this, self );
        });
    },

    /** Search with the selected filter */
    searchWithFilter: function( type, _this, self ) {
        if( !$( _this ).hasClass( 'filter-active' ) ) {
             var query = ( $( '.txtbx-search-data' ).val() ).trim();
             if( query.length >= self.search_query_minimum_length ) {
                 self.applyDomOperations( _this );
                 self.active_filter = type;
                 self.searchOne( self, self.active_filter, query );
             }
        }
    },

    /** Apply the text decoration to the search overlay filters */
    applyDomOperations: function( self ) {
        var $el_filter = $('.overlay-filters a');
        $( '.search-results' ).html( "" );
        $el_filter.css('text-decoration', 'underline').removeClass( 'filter-active' );
        $( self ).css( 'text-decoration', 'none' ).addClass( 'filter-active' );
    },

    /** Call with one filter */
    searchOne: function( self, type, query ) {
        var url = Galaxy.root + 'api/tools';
        switch( type ) {
            case "all":
                self.searchAll( self, url, query );
                break;
            case "tools":
                self.triggerToolSearch( url, query, self );
                break;
            case "current_dataset":
                self.triggerCurrentDatasetSearch( query );
                break;
            case "data_library":
                self.triggerDataLibrarySearch( query );
                break;
            default:
                self.searchAll( self, url, query );
        }
    },

    /** Search in all categories */
    searchAll: function( self, url_root, query ) {
        var $el_search_result = $( '.search-results' ),
            $el_overlay_filters = $( '.overlay-filters' ),
            $el_all_filter = $( '.all-filter' );

        $el_search_result.html( "" );
        $el_overlay_filters.css( 'display', 'block' );
        $el_all_filter.css( 'text-decoration', 'none' );
        if( !$el_all_filter.hasClass( 'filter-active' ) ) {
            $el_all_filter.addClass( 'filter-active' );
        }  
        // Search for current dataset
        self.triggerCurrentDatasetSearch( query );
        // Search for tools
        self.triggerToolSearch( url_root, query, self );
        // Search for data library
        self.triggerDataLibrarySearch();
    },

    /** Asynchronous get call for fetching tools */ 
    triggerToolSearch: function( url_root, query, self ) {
        $.get( url_root, { q: query }, function ( search_result ) {
            toolSearch = new SearchItems({ 'tools': search_result });
        }, "json" );
    },

    /** Trigger current dataset search in the original current dataset search */
    triggerCurrentDatasetSearch: function( query ) {
        var $el = $( '.search-input .search-query' );
        $el.val( query );
        $el.trigger( $.Event("keyup", { keyCode: 13, which: 13 }) );
        $el.trigger( $.Event("keyup", { keyCode: 13, which: 13 }) );
    },

    /** Trigger data library search */
    triggerDataLibrarySearch: function( query ) {
        var url = Galaxy.root + 'api/libraries?deleted=false';
        $.get( url, function ( library_data ) {
            libSearch = new SearchItems({ 'data_library': library_data });
        }, "json" );
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
                           '<a class="currdataset-filter"> Current Datasets </a>' +
                           '<a class="tool-filter"> Tools </a>' +
                           '<a class="workflow-filter"> Workflow </a>' +
                           '<a class="datalibrary-filter"> Data Library </a>' +
                       '</div>' +
                       '<div class="search-results">' +  
                       '</div>' +
	           '</div>' +
               '</div>';
    }
   
});

/** Display search items from Tools, Current datasets */
var SearchItems = Backbone.View.extend({
    self : this,
    data : {},

    /** Initialize the variables */
    initialize: function( item ) {
        var type = Object.keys( item )[0];
        if ( this.data ) {
            switch( type ) {
                case "tools": 
                    this.data.tools = item[ type ];
                    break;
                case "current_dataset":
                    this.data.current_dataset = item[ type ];
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
        active_filter = ( $( '.currdataset-filter' ).hasClass( 'filter-active' ) ? "current_dataset" : active_filter );
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
            if ( !data || data.length == 0 ) {
                this.showEmptySection( $el_search_result );
                return;
            }
            switch( filter ) {
                case "current_dataset":
                    this.makeCurrentDatasetSection( data );
                    break;
                case "tools":
                    this.makeToolSection( data );
                    break;
                case "data_library":
                    this.makeDataLibrarySection( data );
                    break;
                default:
                    this.makeAllSection();
            }
        }
    },

    /** Show empty section if there is no search result */
    showEmptySection: function( $el ) {
        $el.html( "" );
        $el.append( this._templateNoResults() );
    },

    /** Create templates for all the categories in the search result */
    makeAllSection: function() {
        var has_result = false,
            $el_search_result = $( '.search-results' );

        for( type in this.data ) {
            if( this.data[ type ] && this.data[ type ].length > 0 ) {
                has_result = true;
                type === "current_dataset" && this.makeCurrentDatasetSection( this.data[ type ] );
                type === "tools" && this.makeToolSection( this.data[ type ] );
                type === "data_library" && this.makeDataLibrarySection( this.data[ type ] );
            }
        }
        if( !has_result ) {
            this.showEmptySection( $el_search_result );
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
                            is_present = true;
                            var attrs = tool.attributes;
                            tools_template = tools_template + self._buildLinkTemplate( attrs.id, attrs.link, attrs.name, attrs.description, attrs.target, 'tool-search-link', attrs.version, attrs.min_width, attrs.form_style );
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
                        tool_template = tool_template + self._buildLinkTemplate( attributes.id, attributes.link, attributes.name, attributes.description, attributes.target, 'tool-search-link', attributes.version, attributes.min_width, attributes.form_style );
                    }
                }
            });
        });

        // Remove the tool search result section if already present
        $el_search_result.find('.search-tool-main-section').remove();
        // Make a new tool search result section
        $el_search_result.append("<div class='search-tool-main-section'></div>");
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

    /** Build the fetched items template using the template dictionary */ 
    makeToolSearchResultTemplate: function( collection, tool_template ) {
        var header_template = "",
            self = this,
            $el_tool_section = $('.search-tool-main-section'),
            $el_search_result = $( '.search-results' ),
            tool_section_header_template = "<span class='section-header-all'>Tools <hr class='section-hr' align='left'></span>";

        $el_tool_section.html("");        
        if( self.getActiveFilter() === "all" ) {
            // Add tool header in the tool search result section if the search category is 'All'
            $el_tool_section.append( tool_section_header_template );
        }
        
        _.each( collection, function( item ) {
            header_template = self._buildHeaderTemplate( item.id, item.name, 'search-tool-section-name' );
            $el_tool_section.append( header_template );
            $el_tool_section.append( item.template );
        });

        $el_search_result.find( "a.tool-search-link" ).click(function( e ) {
            // Stop the default behaviour of anchor click
            e.preventDefault();
            self.searchedToolLink( self, e );
            self.resetCurrentDatasetSearch();
        }); 
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

    /** Make a template of the current dataset items returned by search routine */
    makeCurrentDatasetSection: function( currdataset_items ) {
        var template_string = "",
            $el_search_result = $( '.search-results' ),
            $el_currdataset_link = $( ".currdataset-search-link" ),
            self = this,
            link = "",
            class_name = 'search-tool-section-name search-currdataset section-header-all';

        // Remove the current dataset search result section if already present
        $el_search_result.find('.search-currdataset').remove();
        $el_currdataset_link.remove();
      
        _.each( currdataset_items.reverse(), function( item ) {
            var attr = item.attributes;
            link = "/datasets/" + attr.dataset_id + "/display/?preview=True";
            template_string = template_string + self._buildLinkTemplate( attr.dataset_id, link, attr.name, attr.description, 'galaxy_main', 'currdataset-search-link' );
        });

        if( self.getActiveFilter() === "all" ) {
            $el_search_result.append( self._buildHeaderTemplate( 'currdataset', 'Current Datasets', class_name ) );
            $el_search_result.append("<hr class='search-currdataset section-hr' align='left'>")
        }

        $el_search_result.append( template_string );
        $el_search_result.find( ".currdataset-search-link" ).css( 'margin-top', '1%' );
        // Reset the current dataset search when overlay is removed
        $el_search_result.find( ".currdataset-search-link" ).click(function( e ) {
            self.removeOverlay();
            self.resetCurrentDatasetSearch();
        });
    },

    /** Make a template for Data library search results */
    makeDataLibrarySection: function( datalib_items ) {
        var template_string = "",
            $el_search_result = $( '.search-results' ),
            $el_datalib_link = $( ".datalib-search-link" ),
            self = this,
            link = "",
            class_name = 'search-tool-section-name search-datalib section-header-all';

        // Remove the data lib search result section if already present
        $el_search_result.find('.search-datalib').remove();
        $el_datalib_link.remove();
      
        _.each( datalib_items, function( item ) {
            link = Galaxy.root + "library/list#folders/" + item.root_folder_id;
            template_string = template_string + self._buildLinkTemplate( item.id, link, item.name, item.description, 'galaxy_main', 'datalib-search-link' );
        });

        if( self.getActiveFilter() === "all" ) {
            $el_search_result.append( self._buildHeaderTemplate( 'datalibrary', 'Data Libraries', class_name ) );
            $el_search_result.append("<hr class='search-datalib section-hr' align='left'>")
        }

        $el_search_result.append( template_string );
        $el_search_result.find( ".datalib-search-link" ).css( 'margin-top', '1%' );
        // Reset the current dataset search when overlay is removed
        $el_search_result.find( ".datalib-search-link" ).click(function( e ) {
            self.removeOverlay();
            self.resetCurrentDatasetSearch();
        });
    },

    /** Return links template */
    _buildLinkTemplate: function( id, link, name, description, target, cls, version, min_width, form_style ) {
        var template = "";
            template = "<a class='" + cls + " btn btn-primary " + id + " ' href='" + link +
               "' role='button' title='" + name + " " + (description ? description : "") +
               "' target='" + target;
            if( cls.indexOf('tool') > -1 ) {
                template = template + "' data-version='" + version +
                    "' minsizehint='" + min_width +
                    "' data-formstyle='" + form_style + "' data-toolid='" + id;
            }
            template = template + "' >" + name + "</a>";
        return template
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
        var $el_search_screen = $( '.search-screen' ),
            $el_search_screen_overlay = $( '.search-screen-overlay' );
        $el_search_screen_overlay.css( 'display', 'none' );
        $el_search_screen.css( 'display', 'none' );
    },
   
    /** Reset the original current dataset search */
    resetCurrentDatasetSearch: function() {
        var $el = $( '.search-input .search-query' );
        $el.focus();
        // Trigger the escape key press
        $el.trigger( $.Event( "keyup", { keyCode: 27, which: 27 } ) );
        $el.blur();
    }

});

return {
    SearchOverlay  : SearchOverlay,
    SearchItems    : SearchItems
};

});

