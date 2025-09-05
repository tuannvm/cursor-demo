package com.legoblocks.renderer.init;

import com.legoblocks.renderer.LegoBlocksMod;
import com.legoblocks.renderer.tileentity.LegoBlockTileEntity;
import net.minecraft.world.level.block.entity.BlockEntityType;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;

public class ModTileEntities {
    public static final DeferredRegister<BlockEntityType<?>> BLOCK_ENTITIES =
            DeferredRegister.create(ForgeRegistries.BLOCK_ENTITY_TYPES, LegoBlocksMod.MODID);

    public static final RegistryObject<BlockEntityType<LegoBlockTileEntity>> LEGO_BLOCK_TILE_ENTITY =
            BLOCK_ENTITIES.register("lego_block", () ->
                    BlockEntityType.Builder.of(LegoBlockTileEntity::new,
                            ModBlocks.LEGO_BRICK_1X1.get(),
                            ModBlocks.LEGO_BRICK_2X2.get(),
                            ModBlocks.LEGO_BRICK_2X4.get(),
                            ModBlocks.LEGO_BRICK_SLOPE.get(),
                            ModBlocks.LEGO_BRICK_CORNER.get()).build(null));

    public static void register(IEventBus eventBus) {
        BLOCK_ENTITIES.register(eventBus);
    }
}
