from setuptools import setup, find_namespace_packages
from setup_helper import find_resource_files

# -- Apps Definition -- #
app_package = 'spatialdv'
release_package = 'tethysapp-' + app_package

# -- Python Dependencies -- #
dependencies = []

# -- Get Resource File -- #
resource_files = find_resource_files('tethysapp/' + app_package + '/templates', 'tethysapp/' + app_package)
resource_files += find_resource_files('tethysapp/' + app_package + '/public', 'tethysapp/' + app_package)
resource_files += find_resource_files('tethysapp/' + app_package + '/workspaces', 'tethysapp/' + app_package)


resource_files += find_resource_files('tethysapp/' + app_package + '/scripts', 'tethysapp/' + app_package)
setup(
    name=release_package,
    version='0.0.1',
    description='Spatial Data Viewer for Hydroshare',
    long_description='',
    keywords='',
    author='Rohit Khattar',
    author_email='rohitkhattar11@gmail.com',
    url='',
    license='BSD-3-Clause',
    packages=find_namespace_packages(),
    package_data={'': resource_files},
    include_package_data=True,
    zip_safe=False,
    install_requires=dependencies,
)