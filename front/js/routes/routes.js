function safeArgBuilder(match) {
  return match && match[1] ? [true, ...match.slice(1)] : [true];
}

export const staticRoutes = {
  "/": { moduleImport: () => import("../pages/home.js"), functionName: "Home" },
  "/home": { moduleImport: () => import("../pages/home.js"), functionName: "Home" },
  "/login": { moduleImport: () => import("../pages/auth/auth.js"), functionName: "Auth" },

  "/admin": { moduleImport: () => import("../pages/admin/admin.js"), functionName: "Admin", protected: true },
  "/dash": { moduleImport: () => import("../pages/dash/dash.js"), functionName: "Dash", protected: true },

  "/profile": { moduleImport: () => import("../pages/profile/userProfile.js"), functionName: "MyProfile", protected: true },
  "/settings": { moduleImport: () => import("../pages/profile/settings.js"), functionName: "Settings", protected: true },

  "/posts": { moduleImport: () => import("../pages/posts/posts.js"), functionName: "Posts" },
  "/create-post": { moduleImport: () => import("../pages/posts/createNewPost.js"), functionName: "CreatePost", protected: true },
  "/create-artist": { moduleImport: () => import("../pages/artist/createArtist.js"), functionName: "CreateArtist", protected: true },
  "/create-event": { moduleImport: () => import("../pages/events/createEvent.js"), functionName: "CreateEvent", protected: true },
  "/events": { moduleImport: () => import("../pages/events/events.js"), functionName: "Events" },
  "/artists": { moduleImport: () => import("../pages/artist/artists.js"), functionName: "Artists" },

  "/map": { moduleImport: () => import("../pages/gtamap/mapgta.js"), functionName: "MapGTA" },
  "/places": { moduleImport: () => import("../pages/places/places.js"), functionName: "Places" },
  "/create-place": { moduleImport: () => import("../pages/places/createPlace.js"), functionName: "CreatePlace", protected: true },

  "/baitos": { moduleImport: () => import("../pages/baitos/baitos.js"), functionName: "Baitos" },
  "/baitos/dash": { moduleImport: () => import("../pages/baitos/baitoDash.js"), functionName: "BaitoDash", protected: true },
  "/baitos/hire": { moduleImport: () => import("../pages/baitos/hireWorkers.js"), functionName: "HireWorkers" },
  "/baitos/create-profile": { moduleImport: () => import("../pages/baitos/createProfile.js"), functionName: "CreateBaitoProfile", protected: true },
  "/create-baito": { moduleImport: () => import("../pages/baitos/createNewBaito.js"), functionName: "CreateBaito", protected: true },

  "/cart": { moduleImport: () => import("../pages/cart/cart.js"), functionName: "Cart", protected: true },
  "/my-orders": { moduleImport: () => import("../pages/cart/myorders.js"), functionName: "MyOrders", protected: true },

  "/itinerary": { moduleImport: () => import("../pages/itinerary/itinerary.js"), functionName: "Itinerary" },
  "/create-itinerary": { moduleImport: () => import("../pages/itinerary/createItinerary.js"), functionName: "CreateItinerary", protected: true },
  "/edit-itinerary": { moduleImport: () => import("../pages/itinerary/editItinerary.js"), functionName: "EditItinerary", protected: true },

  "/booking": { moduleImport: () => import("../pages/booking/booking.js"), functionName: "Booking" },
  "/wallet": { moduleImport: () => import("../pages/wallet/wallet.js"), functionName: "Wallet" },

  "/search": { moduleImport: () => import("../pages/search/search.js"), functionName: "Search" },
  "/social": { moduleImport: () => import("../pages/tumblr/tumblr.js"), functionName: "Tumblr", protected: true },

  "/farms": { moduleImport: () => import("../pages/farm/farms.js"), functionName: "Farms" },
  "/create-farm": { moduleImport: () => import("../pages/farm/createNewFarm.js"), functionName: "CreateFarm", protected: true },
  "/tools": { moduleImport: () => import("../pages/farm/tools.js"), functionName: "Tools" },
  "/products": { moduleImport: () => import("../pages/farm/products.js"), functionName: "Products" },
  "/crops": { moduleImport: () => import("../pages/crop/crops.js"), functionName: "Crops" },
  "/grocery": { moduleImport: () => import("../pages/crop/crops.js"), functionName: "Crops" },

  "/recipes": { moduleImport: () => import("../pages/recipe/recipes.js"), functionName: "Recipes" },
  "/create-recipe": { moduleImport: () => import("../pages/recipe/createNewRecipe.js"), functionName: "CreateRecipe" },
  "/music": { moduleImport: () => import("../pages/music/musiv.js"), functionName: "Music" },

  "/merechats": { moduleImport: () => import("../pages/merechats/merechats.js"), functionName: "MeChats", protected: true },
  "/newchats": { moduleImport: () => import("../pages/newchats/newchats.js"), functionName: "NewChats", protected: true },
  "/discord": { moduleImport: () => import("../pages/discord/discord.js"), functionName: "Discord", protected: true }
};

export const dynamicRoutes = [
  {
    pattern: /^\/user\/([\w-]+)$/,
    moduleImport: () => import("../pages/profile/userProfile.js"),
    functionName: "UserProfile",
    protected: false,
    argBuilder: safeArgBuilder
  },
  {
    pattern: /^\/event\/([\w-]+)\/tickets$/,
    moduleImport: () => import("../pages/events/eventTicketsPage.js"),
    functionName: "EventTickets",
    protected: true,
    argBuilder: safeArgBuilder
  },
  // {
  //   pattern: /^\/event\/([\w-]+)\/merch$/,
  //   moduleImport: () => import("../pages/events/eventMerchPage.js"),
  //   functionName: "EventMerch",
  //   protected: true,
  //   argBuilder: safeArgBuilder
  // },
  // {
  //   pattern: /^\/event\/([\w-]+)\/analytics$/,
  //   moduleImport: () => import("../pages/events/eventAnalyticsPage.js"),
  //   functionName: "EventAnalytics",
  //   protected: true,
  //   argBuilder: safeArgBuilder
  // },
  {
    pattern: /^\/event\/([\w-]+)$/,
    moduleImport: () => import("../pages/events/eventPage.js"),
    functionName: "Event",
    protected: false,
    argBuilder: safeArgBuilder
  },
  {
    pattern: /^\/artist\/([\w-]+)$/,
    moduleImport: () => import("../pages/artist/artistPage.js"),
    functionName: "Artist",
    protected: false,
    argBuilder: safeArgBuilder
  },
  {
    pattern: /^\/place\/([\w-]+)$/,
    moduleImport: () => import("../pages/places/placePage.js"),
    functionName: "Place",
    protected: false,
    argBuilder: safeArgBuilder
  },
  {
    pattern: /^\/merechats\/([\w-]+)$/,
    moduleImport: () => import("../pages/merechats/merePage.js"),
    functionName: "OneChatPage",
    protected: true,
    argBuilder: safeArgBuilder
  },
  {
    pattern: /^\/newchat\/([\w-]+)$/,
    moduleImport: () => import("../pages/newchats/newChatPage.js"),
    functionName: "NewChatPage",
    protected: true,
    argBuilder: safeArgBuilder
  },
  {
    pattern: /^\/discord\/([\w-]+)\/([\w-]+)$/,
    moduleImport: () => import("../pages/discord/discordChannel.js"),
    functionName: "DiscordChannel",
    protected: true,
    argBuilder: safeArgBuilder
  },  
  // Route for single-segment liveid
  {
    pattern: /^\/live\/([\w-]+)$/,
    moduleImport: () => import("../pages/vlive/vlivePage.js"),
    functionName: "Vlive",
    protected: false,
    argBuilder: safeArgBuilder
  },

  // Route for entityType/entityId/liveid
  {
    pattern: /^\/live\/([\w-]+)\/([\w-]+)\/([\w-]+)$/,
    moduleImport: () => import("../pages/vlive/entityLivePage.js"),
    functionName: "Vlive",
    protected: false,
    argBuilder: safeArgBuilder
  },
  {
    pattern: /^\/post\/([\w-]+)$/,
    moduleImport: () => import("../pages/posts/displayPost.js"),
    functionName: "Post",
    protected: false,
    argBuilder: safeArgBuilder
  },
  {
    pattern: /^\/feedpost\/([\w-]+)$/,
    moduleImport: () => import("../pages/feed/postDisplay.js"),
    functionName: "Post",
    protected: false,
    argBuilder: safeArgBuilder
  },
  {
    pattern: /^\/itinerary\/([\w-]+)$/,
    moduleImport: () => import("../pages/itinerary/itineraryDisplay.js"),
    functionName: "Itinerary",
    protected: false,
    argBuilder: safeArgBuilder
  },
  {
    pattern: /^\/hashtag\/([\w-]+)$/,
    moduleImport: () => import("../pages/hashtag/hashtagPage.js"),
    functionName: "Hashtag",
    protected: false,
    argBuilder: safeArgBuilder
  },
  {
    pattern: /^\/baito\/([\w-]+)$/,
    moduleImport: () => import("../pages/baitos/displayBaito.js"),
    functionName: "Baito",
    protected: false,
    argBuilder: safeArgBuilder
  },
  {
    pattern: /^\/baitos\/worker\/([\w-]+)$/,
    moduleImport: () => import("../pages/baitos/displayBaitoWorker.js"),
    functionName: "Worker",
    protected: true,
    argBuilder: safeArgBuilder
  },
  {
    pattern: /^\/products\/(product|tool)\/([\w-]+)$/,
    moduleImport: () => import("../pages/product/product.js"),
    functionName: "Product",
    protected: false,
    argBuilder: safeArgBuilder
  },
  {
    pattern: /^\/crop\/([\w-]+)$/,
    moduleImport: () => import("../pages/crop/cropPage.js"),
    functionName: "Crop",
    protected: false,
    argBuilder: safeArgBuilder
  },
  {
    pattern: /^\/aboutcrop\/([\w-]+)$/,
    moduleImport: () => import("../pages/crop/aboutCropPage.js"),
    functionName: "AboutCrop",
    protected: false,
    argBuilder: safeArgBuilder
  },
  {
    pattern: /^\/farm\/([\w-]+)$/,
    moduleImport: () => import("../pages/crop/displayFarm.js"),
    functionName: "Farm",
    protected: false,
    argBuilder: safeArgBuilder
  },
  {
    pattern: /^\/recipe\/([\w-]+)$/,
    moduleImport: () => import("../pages/recipe/recipePage.js"),
    functionName: "Recipe",
    protected: false,
    argBuilder: safeArgBuilder
  }
];
