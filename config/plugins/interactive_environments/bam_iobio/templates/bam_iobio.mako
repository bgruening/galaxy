 <%namespace name="ie" file="ie.mako" />

<%
import subprocess
from galaxy.util import sockets

# Sets ID and sets up a lot of other variables
ie_request.load_deploy_config()
ie_request.attr.docker_port = 80

ie_request.get_conf_dict()

## General IE specific
# Access URLs for the notebook from within galaxy.
# http://bag:8080/?bam=http://bag:8080/tmp/bamfile.bam

params = {
    'galaxy_url': ie_request.attr.viz_config.get("docker", "galaxy_url"),
    'galaxy_port': ie_request.attr.PORT
    }
notebook_access_url = ie_request.url_template('${PROXY_URL}/?bam=http://%(galaxy_url)s:${PORT}/tmp/bamfile.bam' % (params))
service_polling_url = ie_request.url_template('${PROXY_URL_WS}/bamstatsalive/status' % (params))

bam = ie_request.volume(hda.file_name, '/input/bamfile.bam', how='ro')
bam_index = ie_request.volume(hda.metadata.bam_index.file_name, '/input/bamfile.bam.bai', how='ro')

ie_request.launch(env_override={
    'PUB_HOSTNAME': ie_request.attr.viz_config.get("docker", "galaxy_url"),
    'PUB_HTTP_PORT': ie_request.attr.PORT
    },
    volumes=[bam, bam_index]
)

root = h.url_for( '/' )
%>
<html>
<head>
    ${ ie.load_default_js() }
</head>
<body>

    <script type="text/javascript">

        ${ ie.default_javascript_variables() }
        var notebook_access_url = '${ notebook_access_url }';
        var service_polling_url = '${ service_polling_url }';
        ${ ie.plugin_require_config() }

        requirejs(['interactive_environments', 'plugin/bam_iobio'], function(){
            display_spinner();
        });

        toastr.info(
            "BAM io.bio is starting up!",
            "transferring data ...",
            {'closeButton': true, 'timeOut': 10000, 'tapToDismiss': false}
        );

        var startup = function(){
            // Load notebook
            requirejs(['interactive_environments', 'plugin/bam_iobio'], function(){
                load_notebook(notebook_access_url);
            });

        };
        // polling until the container is ready
        (function poll() {
            setTimeout(function inner() {
                var socket = new WebSocket(service_polling_url);
                var polling = 1;
                socket.onerror = function(event){
                    if(polling == 1) {
                        //console.log("polling websocket");
                        polling = 0;
                        poll();
                    }
                };
                socket.onopen = function(event){
                    //console.log("websocket open");
                    polling = 0;
                    socket.close();
                    startup();
                };
                socket.onclose = function(event){
                    if(polling == 1){
                        //console.log("polling websocket");
                        polling = 0;
                        poll();
                    }
                };
            }, 500);
        })();

    </script>
<div id="main">
</div>
</body>
</html>
