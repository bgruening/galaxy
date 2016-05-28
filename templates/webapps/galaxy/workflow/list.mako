<%inherit file="/webapps/galaxy/base_panels.mako"/>

<%def name="init()">
<%
    self.has_left_panel=False
    self.has_right_panel=False
    self.active_view="workflow"
    self.message_box_visible=False
%>
</%def>

<%def name="stylesheets()">
    ${parent.stylesheets()}

    <style type="text/css">
        .webui-popover-content{display:none}.webui-popover{position:absolute;top:0;left:0;z-index:9999;display:none;min-width:50px;min-height:32px;padding:1px;text-align:left;white-space:normal;background-color:#fff;background-clip:padding-box;border:1px solid #ccc;border:1px solid rgba(0,0,0,.2);border-radius:6px;-webkit-box-shadow:0 5px 10px rgba(0,0,0,.2);box-shadow:0 5px 10px rgba(0,0,0,.2)}.webui-popover.top,.webui-popover.top-left,.webui-popover.top-right{margin-top:-10px}.webui-popover.right,.webui-popover.right-top,.webui-popover.right-bottom{margin-left:10px}.webui-popover.bottom,.webui-popover.bottom-left,.webui-popover.bottom-right{margin-top:10px}.webui-popover.left,.webui-popover.left-top,.webui-popover.left-bottom{margin-left:-10px}.webui-popover.pop{-webkit-transform:scale(0.8);-o-transform:scale(0.8);transform:scale(0.8);-webkit-transition:transform .15s cubic-bezier(0.3,0,0,1.5);-o-transition:transform .15s cubic-bezier(0.3,0,0,1.5);transition:transform .15s cubic-bezier(0.3,0,0,1.5);opacity:0;filter:alpha(opacity=0)}.webui-popover.pop-out{-webkit-transition-property:"opacity,transform";-o-transition-property:"opacity,transform";transition-property:"opacity,transform";-webkit-transition:.15s linear;-o-transition:.15s linear;transition:.15s linear;opacity:0;filter:alpha(opacity=0)}.webui-popover.fade,.webui-popover.fade-out{-webkit-transition:opacity .15s linear;-o-transition:opacity .15s linear;transition:opacity .15s linear;opacity:0;filter:alpha(opacity=0)}.webui-popover.out{opacity:0;filter:alpha(opacity=0)}.webui-popover.in{-webkit-transform:none;-o-transform:none;transform:none;opacity:1;filter:alpha(opacity=100)}.webui-popover .webui-popover-content{padding:9px 14px;overflow:auto;display:block}.webui-popover-inner .close{font-family:arial;margin:8px 10px 0 0;float:right;font-size:16px;font-weight:700;line-height:16px;color:#000;text-shadow:0 1px 0 #fff;opacity:.2;filter:alpha(opacity=20);text-decoration:none}.webui-popover-inner .close:hover,.webui-popover-inner .close:focus{opacity:.5;filter:alpha(opacity=50)}.webui-popover-title{padding:8px 14px;margin:0;font-size:14px;font-weight:700;line-height:18px;background-color:#fff;border-bottom:1px solid #f2f2f2;border-radius:5px 5px 0 0}.webui-popover-content{padding:9px 14px;overflow:auto;display:none}.webui-popover-inverse{background-color:#333;color:#eee}.webui-popover-inverse .webui-popover-title{background:#333;border-bottom:1px solid #3b3b3b;color:#eee}.webui-no-padding .webui-popover-content{padding:0}.webui-no-padding .list-group-item{border-right:none;border-left:none}.webui-no-padding .list-group-item:first-child{border-top:0}.webui-no-padding .list-group-item:last-child{border-bottom:0}.webui-popover>.arrow,.webui-popover>.arrow:after{position:absolute;display:block;width:0;height:0;border-color:transparent;border-style:solid}.webui-popover>.arrow{border-width:11px}.webui-popover>.arrow:after{border-width:10px;content:""}.webui-popover.top>.arrow,.webui-popover.top-right>.arrow,.webui-popover.top-left>.arrow{bottom:-11px;left:50%;margin-left:-11px;border-top-color:#999;border-top-color:rgba(0,0,0,.25);border-bottom-width:0}.webui-popover.top>.arrow:after,.webui-popover.top-right>.arrow:after,.webui-popover.top-left>.arrow:after{content:" ";bottom:1px;margin-left:-10px;border-top-color:#fff;border-bottom-width:0}.webui-popover.right>.arrow,.webui-popover.right-top>.arrow,.webui-popover.right-bottom>.arrow{top:50%;left:-11px;margin-top:-11px;border-left-width:0;border-right-color:#999;border-right-color:rgba(0,0,0,.25)}.webui-popover.right>.arrow:after,.webui-popover.right-top>.arrow:after,.webui-popover.right-bottom>.arrow:after{content:" ";left:1px;bottom:-10px;border-left-width:0;border-right-color:#fff}.webui-popover.bottom>.arrow,.webui-popover.bottom-right>.arrow,.webui-popover.bottom-left>.arrow{top:-11px;left:50%;margin-left:-11px;border-bottom-color:#999;border-bottom-color:rgba(0,0,0,.25);border-top-width:0}.webui-popover.bottom>.arrow:after,.webui-popover.bottom-right>.arrow:after,.webui-popover.bottom-left>.arrow:after{content:" ";top:1px;margin-left:-10px;border-bottom-color:#fff;border-top-width:0}.webui-popover.left>.arrow,.webui-popover.left-top>.arrow,.webui-popover.left-bottom>.arrow{top:50%;right:-11px;margin-top:-11px;border-right-width:0;border-left-color:#999;border-left-color:rgba(0,0,0,.25)}.webui-popover.left>.arrow:after,.webui-popover.left-top>.arrow:after,.webui-popover.left-bottom>.arrow:after{content:" ";right:1px;border-right-width:0;border-left-color:#fff;bottom:-10px}.webui-popover-inverse.top>.arrow,.webui-popover-inverse.top-left>.arrow,.webui-popover-inverse.top-right>.arrow,.webui-popover-inverse.top>.arrow:after,.webui-popover-inverse.top-left>.arrow:after,.webui-popover-inverse.top-right>.arrow:after{border-top-color:#333}.webui-popover-inverse.right>.arrow,.webui-popover-inverse.right-top>.arrow,.webui-popover-inverse.right-bottom>.arrow,.webui-popover-inverse.right>.arrow:after,.webui-popover-inverse.right-top>.arrow:after,.webui-popover-inverse.right-bottom>.arrow:after{border-right-color:#333}.webui-popover-inverse.bottom>.arrow,.webui-popover-inverse.bottom-left>.arrow,.webui-popover-inverse.bottom-right>.arrow,.webui-popover-inverse.bottom>.arrow:after,.webui-popover-inverse.bottom-left>.arrow:after,.webui-popover-inverse.bottom-right>.arrow:after{border-bottom-color:#333}.webui-popover-inverse.left>.arrow,.webui-popover-inverse.left-top>.arrow,.webui-popover-inverse.left-bottom>.arrow,.webui-popover-inverse.left>.arrow:after,.webui-popover-inverse.left-top>.arrow:after,.webui-popover-inverse.left-bottom>.arrow:after{border-left-color:#333}.webui-popover i.icon-refresh:before{content:""}.webui-popover i.icon-refresh{display:block;width:30px;height:30px;font-size:20px;top:50%;left:50%;position:absolute;margin-left:-15px;margin-right:-15px;background:url(../img/loading.gif) no-repeat}@-webkit-keyframes rotate{100%{-webkit-transform:rotate(360deg)}}@keyframes rotate{100%{transform:rotate(360deg)}}.webui-popover-backdrop{background-color:rgba(0,0,0,.65);width:100%;height:100%;position:fixed;top:0;left:0;z-index:9998}.webui-popover .dropdown-menu{display:block;position:relative;top:0;border:none;box-shadow:none;float:none}

        .workflow-tags div {
            background-color: #f2f2f2;
            border: 1px solid #ccc;
            border-radius: 4px;
            padding: 2px 4px;
            margin-right: 5px;
            float: left;
        }
    </style>
</%def>

<%def name="late_javascripts()">
    ${parent.late_javascripts()}

    <script type="text/javascript">
        function collapse($elem) {
            $elem.text($elem.attr('tag-name').substr(0,1) + '..');
        }

        function expand($elem) {
            $elem.text($elem.attr('tag-name'));
        }

        $('.workflow-tags div')
            .each(function(idx, item) {
                collapse($(item));
            })
            .hover(
                function() {
                    expand($(this));
                },
                function() {
                    collapse($(this));
                }
            );
    </script>
</%def>

<%def name="title()">Workflow home</%def>

<%def name="center_panel()">
    <div style="overflow: auto; height: 100%;">
        <div class="page-container" style="padding: 10px;">
            %if message:
                <%
                    try:
                        status
                    except:
                        status = "done"
                %>
                <p />
                <div class="${status}message">
                    ${h.to_unicode( message )}
                </div>
            %endif

            <h2>Your workflows</h2>

            <ul class="manage-table-actions">
                <li>
                    <a class="action-button" href="${h.url_for( controller='workflow', action='create' )}">
                        <img src="${h.url_for('/static/images/silk/add.png')}" />
                        <span>Create new workflow</span>
                    </a>
                </li>
                <li>
                    <a class="action-button" href="${h.url_for( controller='workflow', action='import_workflow' )}">
                        <img src="${h.url_for('/static/images/fugue/arrow-090.png')}" />
                        <span>Upload or import workflow</span>
                    </a>
                </li>
            </ul>

            %if workflows:
                <table class="manage-table colored" border="0" cellspacing="0" cellpadding="0" style="width:100%;">
                    <tr class="header">
                        <th>Name</th>
                        <th># of Steps</th>
                        <th>Last Updated</th>
                        <th>Tags</th>
                        <th></th>
                    </tr>
                    %for i, workflow in enumerate( workflows ):
                        <tr>
                            <td>
                                <div class="menubutton" style="float: left;" id="wf-${i}-popup">
                                ${h.to_unicode( workflow.name ) | h}
                                </div>
                            </td>
                            <td>${len(workflow.latest_workflow.steps)}</td>
                            <td>${workflow.update_time.strftime('%d.%m.%Y %X')}</td>
                            <td>
                                <div class="workflow-tags">
                                    %for tag in workflow.w_tags:
                                        <div tag-name="${h.to_unicode( tag ) | h}"></div>
                                    %endfor
                                </div>
                            </td>
                            <td>
                                <div popupmenu="wf-${i}-popup">
                                <a class="action-button" href="${h.url_for( controller='workflow', action='editor', id=trans.security.encode_id( workflow.id ) )}" target="_parent">Edit</a>
                                <a class="action-button" href="${h.url_for( controller='root', action='index', workflow_id=trans.security.encode_id( workflow.id ) )}" target="_parent">Run</a>
                                <a class="action-button" href="${h.url_for( controller='workflow', action='sharing', id=trans.security.encode_id( workflow.id ) )}">Share or Publish</a>
                                <a class="action-button" href="${h.url_for( controller='workflow', action='export', id=trans.security.encode_id( workflow.id ) )}">Download or Export</a>
                                <a class="action-button" href="${h.url_for( controller='workflow', action='copy', id=trans.security.encode_id( workflow.id ) )}">Copy</a>
                                <a class="action-button" href="${h.url_for( controller='workflow', action='rename', id=trans.security.encode_id( workflow.id ) )}">Rename</a>
                                <a class="action-button" href="${h.url_for( controller='workflow', action='display_by_id', id=trans.security.encode_id( workflow.id ) )}" target="_top">View</a>
                                <a class="action-button" confirm="Are you sure you want to delete workflow '${h.to_unicode( workflow.name ) | h}'?" href="${h.url_for( controller='workflow', action='delete', id=trans.security.encode_id( workflow.id ) )}">Delete</a>
                                </div>
                            </td>
                        </tr>
                    %endfor
                </table>
            %else:
                You have no workflows.
            %endif

            <h2>Workflows shared with you by others</h2>

            %if shared_by_others:
                <table class="colored" border="0" cellspacing="0" cellpadding="0" width="100%">
                    <tr class="header">
                        <th>Name</th>
                        <th>Owner</th>
                        <th># of Steps</th>
                        <th></th>
                    </tr>
                    %for i, association in enumerate( shared_by_others ):
                        <% workflow = association.stored_workflow %>
                        <tr>
                            <td>
                                <a class="menubutton" id="shared-${i}-popup" href="${h.url_for( controller='workflow', action='run', id=trans.security.encode_id(workflow.id) )}">${h.to_unicode( workflow.name ) | h}</a>
                            </td>
                            <td>${workflow.user.email}</td>
                            <td>${len(workflow.latest_workflow.steps)}</td>
                            <td>
                                <div popupmenu="shared-${i}-popup">
                                    <a class="action-button" href="${h.url_for( controller='workflow', action='display_by_username_and_slug', username=workflow.user.username, slug=workflow.slug )}" target="_top">View</a>
                                    <a class="action-button" href="${h.url_for( controller='workflow', action='run', id=trans.security.encode_id( workflow.id ) )}">Run</a>
                                    <a class="action-button" href="${h.url_for( controller='workflow', action='copy', id=trans.security.encode_id( workflow.id ) )}">Copy</a>
                                    <a class="action-button" confirm="Are you sure you want to remove the shared workflow '${h.to_unicode( workflow.name ) | h}'?" href="${h.url_for( controller='workflow', action='sharing', unshare_me=True, id=trans.security.encode_id( workflow.id ))}">Remove</a>
                                </div>
                            </td>
                        </tr>
                    %endfor
                </table>
            %else:
                No workflows have been shared with you.
            %endif

            <h2>Other options</h2>

            <a class="action-button" href="${h.url_for( controller='workflow', action='configure_menu' )}">
                <span>Configure your workflow menu</span>
            </a>
        </div>
    </div>
</%def>
