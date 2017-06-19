/** Published history view */
define( [ 'utils/utils', 'mvc/ui/ui-misc' ], function( Utils, Ui ) {
    var View = Backbone.View.extend({

        initialize: function( options ) {
            this.setElement( '<div/>' );
            this.render();
        },

        render: function() {
            var self = this,
                min_query_length = 3;

            Utils.get({
                url: Galaxy.root + 'api/histories/published/',
                data: { 'detailed': 'detailed' },
                success: function( response ) {
                    var tags = [],
                        $el_tags = null;
                    self.$el.empty().append( self._templateHeader() )
                    _.each(response, function( item ) {
                        _.each( item.tags, function( tag_item ) {
                            // Add unique tag names to the list
                            if( !_.contains(tags, tag_item) ) {
                                tags.push( tag_item );
                            }
                        });
                    });
                
                    // Append templates
                    $el_tags = self.$el.find( '.published-histories' );
                    $el_tags.append( self._templateTagsTableActionButtons() );
                    $el_tags.append( self._templateHistoryTagsTable( self, tags ) );
                    self.register_tag_click( self, tags, response );

                    // Register search tags event
                    self.filter_items( self, self.$el.find( '.search-tags-input' ), self.$el.find( '.search-tags-tbody tr' ), min_query_length );
                },
                error: function( response ) {
                    var error_msg = "Error occurred while loading the resource.",
                        options = { 'message': error_msg, 'status': 'error', 'persistent': true, 'cls': 'errormessage' },
                        error = new Ui.Message( options );
                    self.$el.empty().append( error.$el );
                }
            });
        },

        /** Register click for tags */
        register_tag_click: function( self, tags, published_history_list ) {
            _.each( tags, function( tag ) {
                var $el_tags = self.$el.find( '.published-histories' );
                $el_tags.find( '.history-tag-' + tag ).click(function( e ) {
                    e.preventDefault();
                    var template_tag_history_item = self._templatePublishedHistoryTable( self, published_history_list, tag ),
                        $el_tr = $el_tags.find( '.tr-' + tag ),
                        $el_td = $el_tags.find( '.tr-' + tag + ' td' );
                    $el_td.empty().append( template_tag_history_item );
                    if( $el_tr.css( "display" ) === "none" ) {
                        $el_tr.show();
                        $el_tags.find( '.history-tag-' + tag ).removeClass( 'fa-plus-square-o' ).addClass( 'fa-minus-square-o ' );
                    }
                    else {
                        $el_tr.hide();
                        $el_tags.find( '.history-tag-' + tag ).addClass( 'fa-plus-square-o' ).removeClass( 'fa-minus-square-o ' );
                    }
                });
            });
        },

        /** Implement a client side filtering */
        filter_items: function( self, $el_searchinput, $el_tabletr, min_querylen ) {
            $el_searchinput.on( 'keyup', function () {
                var query = $( this ).val();
                // Filter when query is at least 3 characters
                // otherwise show all rows
                if( query.length >= min_querylen ) {
                    // Ignore the query's case using 'i'
                    var regular_expression = new RegExp( query, 'i' );
                    $el_tabletr.hide();
                    $el_tabletr.filter(function () {
                        // Apply regular expression on each row's text
                        // and show when there is a match
                        return regular_expression.test( $( this ).text() );
                    }).show();
                }
                else {
                    $el_tabletr.show();
                }
            });
        },

        /** Main template */
        _templateHeader: function() {
            return '<div class="page-container">' +
                       '<div class="published-histories">' +
                           '<h2>Published Histories</h2>' +
                       '</div>'+
                   '</div>';
        },

        /** Template for history tags table */
        _templateHistoryTagsTable: function( self, tags ) {
            var tableHtml = "",
                trHtml = "";
            tableHtml = tableHtml + '<table class="table colored"><thead>' +
                '<tr class="header">' +
                    '<th>Tag names</th>' +
                '</tr></thead>';

            _.each( tags, function( tag ) {
                trHtml = trHtml + '<tr>' +
                              '<td> <a class="fa fa-plus-square-o history-tag-'+ tag +' tags-link"><span>' + tag.toLowerCase() + '</span></a></td>' +
                         '</tr>' + 
                         '<tr class="tr-'+ tag +' published-history-tr">' +
                              '<td></td>' +
                         '</tr>';
            });
            return tableHtml + '<tbody class="search-tags-tbody">' + trHtml + '</tbody></table>';
        },

        /** Template for actions for history item table */
        _templateTagsTableActionButtons: function() {
           return '<ul class="manage-table-actions">' +
                '<li>' +
                    '<input class="search-tags-input form-control" type="text" autocomplete="off" placeholder="search for tags...">' +
                '</li>' +
            '</ul>';
        },

        /** Template for published history items table */
        _templatePublishedHistoryTable: function( self, published_history_list, tag ) {
            var tableHtml = "",
                trHtml = "";
            tableHtml = tableHtml + '<table class="table colored"><thead>' +
                    '<tr class="header">' +
                        '<th>Name</th>' +
                        '<th>Annotation</th>' +
                    '</tr></thead>';
            _.each( published_history_list, function( history_item ) {
                if( _.contains( history_item.tags, tag ) ) {
                    trHtml = trHtml + '<tr>' +
                        '<td><a href=' + Galaxy.root + history_item.username_and_slug + '>' + _.escape( history_item.name ) + '</a></td>' +
                        '<td>' + _.escape( history_item.annotation ) + '</td>' +
                    '</tr>';
                }
            });
            return tableHtml + '<tbody class="history_item-search">' + trHtml + '</tbody></table>';
        },
    });
    
    return {
        View : View
    };
});
