Meteor admin-site test app
==========================

## Packages

```
$ mrt add bootstrap-3
$ mrt add iron-router
$ mrt add spin

$ mrt add accounts-ui-bootstrap-3
$ mrt add accounts-password

$ meteor remove insecure
$ meteor remove autopublish
```

## Symbolic link to the admin-site package

```
$ cd tests/app/packages
$ ln -s ../../.. admin-site

$ cd ..
$ mrt add admin-site
```
