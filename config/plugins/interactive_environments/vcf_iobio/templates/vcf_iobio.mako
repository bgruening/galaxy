 <%namespace name="ie" file="ie.mako" />

<%
import subprocess
from galaxy.util import sockets

# Sets ID and sets up a lot of other variables
ie_request.load_deploy_config()
ie_request.attr.docker_port = 80

conf = ie_request.get_conf_dict()

## General IE specific
# Access URLs for the notebook from within galaxy.
# http://bag:8080/?vcf=http://bag:8080/tmp/vcffile.vcf.gz

params = {
    'galaxy_url': ie_request.attr.viz_config.get("docker", "galaxy_url"),
    'galaxy_port': ie_request.attr.PORT
    }
notebook_access_url = ie_request.url_template('http://%(galaxy_url)s:%(galaxy_port)s/?vcf=http://%(galaxy_url)s:${PORT}/tmp/vcffile.vcf.gz' % (params))

vcf = ie_request.volume(hda.file_name, '/input/vcffile.vcf', how='ro')


docker_cmd = ie_request.docker_cmd( )

# VCF iobio needs to have vcf.gz and vcf.gz.tbi files.
# We have added compression and indexing support into the container, so we can
# pass plain VCF files into it.
# The big disatvantage is that this can take a long time which will block the user experience.
# We need to generate both files on the Galaxy side, before starting the visualisation.
# This needs to be done! ToDo
env_override = {
    'PUB_HOSTNAME': conf["galaxy_url"],
    'PUB_HTTP_PORT': sockets.unused_port(),
    'PUB_TABIX_PORT': sockets.unused_port(),
    'PUB_VCFDEPTHER_PORT': sockets.unused_port(),
    'PUB_VCFSTATSALIVE_PORT': sockets.unused_port(),
    'INPUT_VCFFILE': hda.file_name,
   #'INPUT_VCFFILE_GZIP': '/home/bag/projects/code/docker/bamio/dir_vcf/vcffile.vcf.gz',
   #'INPUT_VCFFILE_INDEX': '/home/bag/projects/code/docker/bamio/dir_vcf/vcffile.vcf.gz.tbi',
}

inject = """ -p %(PUB_HTTP_PORT)s:80 \
    -p %(PUB_TABIX_PORT)s:8000 \
    -p %(PUB_VCFDEPTHER_PORT)s:8001 \
    -p %(PUB_VCFSTATSALIVE_PORT)s:8002 \
""" % env_override

# TODO: This inject command isn't actually used, it's just here for documenting
# what's supposed to happen, until the IOBIO folks can update their VCF image.
# Inject all port numbers from as environment variable to the iobio container.
# iobio will pick them up and adapt accordingly
#
#docker_cmd = docker_cmd.replace('-v', inject)
#ie_request.log.info("Starting VCF.iobio docker container with command [%s]" % docker_cmd)
#subprocess.call(docker_cmd, shell=True)

ie_request.launch(env_override=env_override,
    volumes=[vcf]
)

root = h.url_for( '/' )
%>
<html>
<head>
    ${ ie.load_default_js() }
</head>
<body>
    <!-- TODO: unify spinners between this/bam -->
    <script type="text/javascript">

        $("#spinner").show();

        ${ ie.default_javascript_variables() }
        var notebook_access_url = '${ notebook_access_url }';
        ${ ie.plugin_require_config() }

        toastr.info(
            "VCF io.bio is starting up!",
            "transferring data ...",
            {'closeButton': true, 'timeOut': 10000, 'tapToDismiss': false}
        );

        var hide_spinner = function(){
            $("#spinner").hide();

            // Load notebook
            requirejs(['interactive_environments', 'plugin/vcf_iobio'], function(){
                load_notebook(notebook_access_url);
            });

        };
        // sleep 10 seconds
        // this is currently needed to get the vis right
        // plans exists to move this spinner into the container
        setTimeout(hide_spinner, 10000);

    </script>
    <div id="main" width="100%" height="100%">
        <table border="0" height="100%" width="100%">
            <tr><td valign="center" align="center">
                <img src="${root}static/style/largespinner.gif" id="spinner" class="spinner"/>
            </td></tr>
        </table>
    </div>
</body>
</html>
