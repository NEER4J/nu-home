// Register taxonomies with REST API support
function register_boiler_taxonomies() {
    // Register bedroom_supported taxonomy
    register_taxonomy('bedroom_supported', 'boiler', array(
        'labels' => array(
            'name' => 'Bedroom Supported',
            'singular_name' => 'Bedroom Supported'
        ),
        'hierarchical' => false,
        'show_in_rest' => true,
        'rest_base' => 'bedroom_supported',
        'rest_controller_class' => 'WP_REST_Terms_Controller',
        'show_admin_column' => true,
        'query_var' => true,
        'rewrite' => array('slug' => 'bedroom-supported')
    ));

    // Register boilertype taxonomy
    register_taxonomy('boilertype', 'boiler', array(
        'labels' => array(
            'name' => 'Boiler Type',
            'singular_name' => 'Boiler Type'
        ),
        'hierarchical' => false,
        'show_in_rest' => true,
        'rest_base' => 'boilertype',
        'rest_controller_class' => 'WP_REST_Terms_Controller',
        'show_admin_column' => true,
        'query_var' => true,
        'rewrite' => array('slug' => 'boiler-type')
    ));
}
add_action('init', 'register_boiler_taxonomies'); 