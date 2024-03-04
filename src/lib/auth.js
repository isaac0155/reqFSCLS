module.exports ={

    isLoggedIn(req, res, next){
        //console.log(req.originalUrl)
        if (req.isAuthenticated()){
            return next();
        }
        req.flash('warning', 'Inicia Sesión para ver la página');
        var redirectUrl = '/signin'+req.originalUrl;
        return res.redirect(redirectUrl);
    },
    isNotLoggedIn(req, res, next){
        if (!req.isAuthenticated()){
            return next();
        }
        return res.redirect('/profile');
    },
    isAdmin(req, res, next){
        //console.log(req.originalUrl)
        if (req.isAuthenticated() && req.user.rol == 'Administrador'){
            return next();
        }
        req.flash('danger', 'No tienes permiso para ver la página. Inicia Sesión como Administrador');
        var redirectUrl = '/signin' + req.originalUrl;
        return res.redirect(redirectUrl);
    },
}