module.exports ={

    isLoggedIn(req, res, next){
        if (req.isAuthenticated()){
            return next();
        }
        req.flash('warning', 'Inicia Sesión para ver la página');
        return res.redirect('/signin');
    },
    isNotLoggedIn(req, res, next){
        if (!req.isAuthenticated()){
            return next();
        }
        return res.redirect('/profile');
    },
    isAdmin(req, res, next){
        if (req.isAuthenticated() && req.user.rol == 'Administrador'){
            return next();
        }
        req.flash('danger', 'No tienes permiso para ver la página. Inicia Sesión como Administrador');
        return res.redirect('/profile');
    },
   

}