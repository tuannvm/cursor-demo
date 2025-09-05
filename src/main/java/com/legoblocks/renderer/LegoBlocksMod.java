package com.legoblocks.renderer;

import com.legoblocks.renderer.init.ModBlocks;
import com.legoblocks.renderer.init.ModTileEntities;
import com.legoblocks.renderer.client.render.LegoBlockRenderer;
import net.minecraft.client.renderer.ItemBlockRenderTypes;
import net.minecraft.client.renderer.RenderType;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.EntityRenderersEvent;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.event.lifecycle.FMLClientSetupEvent;
import net.minecraftforge.fml.javafmlmod.FMLJavaModLoadingContext;

@Mod(LegoBlocksMod.MODID)
public class LegoBlocksMod {
    public static final String MODID = "legoblocks";
    
    public LegoBlocksMod() {
        IEventBus modEventBus = FMLJavaModLoadingContext.get().getModEventBus();
        
        // Register our stuff
        ModBlocks.register(modEventBus);
        ModTileEntities.register(modEventBus);
        
        modEventBus.addListener(this::clientSetup);
    }
    
    private void clientSetup(final FMLClientSetupEvent event) {
        // Set render layers for our blocks
        ItemBlockRenderTypes.setRenderLayer(ModBlocks.LEGO_BRICK_1X1.get(), RenderType.solid());
        ItemBlockRenderTypes.setRenderLayer(ModBlocks.LEGO_BRICK_2X2.get(), RenderType.solid());
        ItemBlockRenderTypes.setRenderLayer(ModBlocks.LEGO_BRICK_2X4.get(), RenderType.solid());
    }
    
    @Mod.EventBusSubscriber(modid = MODID, bus = Mod.EventBusSubscriber.Bus.MOD, value = Dist.CLIENT)
    public static class ClientModEvents {
        @SubscribeEvent
        public static void onRegisterRenderers(EntityRenderersEvent.RegisterRenderers event) {
            event.registerBlockEntityRenderer(ModTileEntities.LEGO_BLOCK_TILE_ENTITY.get(),
                    LegoBlockRenderer::new);
        }
    }
}
