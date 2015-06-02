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
# http://bag:8080/?vcf=http://bag:8080/tmp/vcffile.vcf.gz

params = {
    'galaxy_url': ie_request.attr.viz_config.get("docker", "galaxy_url"),
    'galaxy_port': ie_request.attr.PORT
    }
notebook_access_url = ie_request.url_template('http://%(galaxy_url)s:%(galaxy_port)s/?vcf=http://%(galaxy_url)s:${PORT}/tmp/vcffile.vcf.gz' % (params))

docker_cmd = ie_request.docker_cmd( )

# Define variables for all ports that needs to be available for the iobio visualisation.
ENV_KEYS = ['PUB_HTTP_PORT', 'PUB_TABIX_PORT', 'PUB_VCFDEPTHER_PORT', 'PUB_VCFSTATSALIVE_PORT']

# VCF iobio needs to have vcf.gz and vcf.gz.tbi files.
# We have added compression and indexing support into the container, so we can
# pass plain VCF files into it.
# The big disatvantage is that this can take a long time which will block the user experience.
# We need to generate both files on the Galaxy side, before starting the visualisation.
# This needs to be done! ToDo
ENV = {
        'PUB_HOSTNAME': ie_request.attr.viz_config.get("docker", "galaxy_url"),
        'INPUT_VCFFILE': hda.file_name,
        #'INPUT_VCFFILE_GZIP': '/home/bag/projects/code/docker/bamio/dir_vcf/vcffile.vcf.gz',
        #'INPUT_VCFFILE_INDEX': '/home/bag/projects/code/docker/bamio/dir_vcf/vcffile.vcf.gz.tbi',
        }

# Get for every ENV_KEYS one free port.
for key in ENV_KEYS:
    port = sockets.unused_port()
    ENV.update({key:port})

# Setting up all environment variables and mounting in
# the VCF file, readonly. No copying needed here.
inject = """ -p %(PUB_HTTP_PORT)s:80 \
    -p %(PUB_TABIX_PORT)s:8000 \
    -p %(PUB_VCFDEPTHER_PORT)s:8001 \
    -p %(PUB_VCFSTATSALIVE_PORT)s:8002 \
    -e PUB_HOSTNAME=%(PUB_HOSTNAME)s \
    -e PUB_HTTP_PORT=%(PUB_HTTP_PORT)s \
    -e PUB_TABIX_PORT=%(PUB_TABIX_PORT)s \
    -e PUB_VCFDEPTHER_PORT=%(PUB_VCFDEPTHER_PORT)s \
    -e PUB_VCFSTATSALIVE_PORT=%(PUB_VCFSTATSALIVE_PORT)s \
    -v %(INPUT_VCFFILE)s:/input/vcffile.vcf:ro \
    -v """ % (ENV)

# Inject all port numbers from as environment variable to the iobio container.
# iobio will pick them up and adopt accordingly
docker_cmd = docker_cmd.replace('-v', inject)
ie_request.log.info("Starting VCF.iobio docker container with command [%s]" % docker_cmd)

subprocess.call(docker_cmd, shell=True)
root = h.url_for( '/' )
%>
<html>
<head>
${ ie.load_default_js() }
</head>
<body>

    <div id="main" width="100%" height="100%">
        <table border="0" height="100%" width="100%">
            <tr><td valign="center" align="center">
                <img src="${root}static/style/largespinner.gif" id="spinner" class="spinner"/>
            </td></tr>
        </table>
    </div>
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
</body>
</html>
